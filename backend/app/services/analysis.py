from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.core.config import get_settings
from app.core.errors import AppError
from app.db.session import SessionLocal
from app.models.complaint_analysis import ComplaintAnalysis
from app.models.complaint_category import ComplaintCategoryLv1, ComplaintCategoryLv2
from app.models.data_center import DataRecord, DataStatus, DataType
from app.models.rbac import RoleDataScope, User
from app.models.root_cause_kb import RootCauseKb
from app.models.task import TaskStatus
from app.services.audit import create_audit_log
from app.services.data_scope import DataScopeProfile
from app.tasks.progress import update_task_progress


def new_id() -> str:
    return uuid.uuid4().hex


def load_actor_stub(db: Session, actor_id: int | None) -> CurrentUser | None:
    if not actor_id:
        return None
    user = db.get(User, actor_id)
    if not user:
        return None
    profile = DataScopeProfile(
        scope=RoleDataScope.SELF,
        user_id=user.id,
        dept_id=user.department_id,
        custom_dept_ids=frozenset(),
    )
    return CurrentUser(
        id=user.id,
        username=user.username,
        dept_id=user.department_id,
        permission_codes=frozenset(),
        menu_ids=frozenset(),
        data_scope=profile,
    )


@dataclass(frozen=True)
class AnalysisResult:
    category_lv1: str
    category_lv2: str
    root_cause_surface: str
    root_cause_direct: str
    root_cause_deep: str
    responsible_dept: str
    risk_level: str
    is_repeated: bool
    confidence: float
    evidence_snippets: list[dict[str, str]]
    suggested_rectification: dict[str, str]
    model_version: str
    analyzed_at: datetime


_CATEGORY_LV2_BY_LV1: dict[str, list[str]] = {
    "设施设备类": [
        "电梯故障",
        "门禁系统故障",
        "供水故障",
        "供电故障",
        "消防设备故障",
        "公共照明故障",
        "排水系统故障",
        "空调系统故障",
        "其他设备故障",
    ],
    "物业服务类": [
        "客服服务态度差",
        "报修响应不及时",
        "装修管理违规",
        "快递服务问题",
        "社区活动问题",
        "信息公示不及时",
        "其他服务问题",
    ],
    "收费争议类": [
        "物业费异议",
        "停车费异议",
        "水电费异议",
        "增值服务费异议",
        "退费问题",
        "其他收费争议",
    ],
    "环境绿化类": [
        "保洁不到位",
        "垃圾清运不及时",
        "消杀不到位",
        "绿化养护差",
        "公共区域异味",
        "其他环境问题",
    ],
    "安全管理类": [
        "外来人员管理不严",
        "车辆管理混乱",
        "监控设备故障",
        "巡逻不到位",
        "消防通道堵塞",
        "高空抛物",
        "其他安全问题",
    ],
    "邻里纠纷类": [
        "噪音扰民",
        "占用公共区域",
        "宠物扰民",
        "其他邻里纠纷",
    ],
    "其他类": [
        "地产遗留问题",
        "其他无法归类问题",
    ],
}


_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "电梯故障": ["电梯", "困", "坠", "停梯"],
    "门禁系统故障": ["门禁", "刷卡", "识别", "闸机"],
    "供水故障": ["停水", "没水", "供水", "水压", "爆管", "水管"],
    "供电故障": ["停电", "断电", "供电", "电路", "跳闸", "配电"],
    "消防设备故障": ["消防", "喷淋", "消火栓", "报警器", "灭火器"],
    "公共照明故障": ["照明", "灯", "路灯", "楼道灯"],
    "排水系统故障": ["排水", "下水", "堵", "返水", "积水", "漏水"],
    "空调系统故障": ["空调", "制冷", "制热", "风机", "新风"],
    "其他设备故障": ["设备", "设施", "损坏", "故障"],
    "客服服务态度差": ["态度", "不耐烦", "敷衍", "推诿", "骂"],
    "报修响应不及时": ["报修", "响应", "迟迟", "没人", "不来", "拖"],
    "装修管理违规": ["装修", "施工", "扰民", "违规", "噪音"],
    "快递服务问题": ["快递", "驿站", "丢件", "取件", "放错"],
    "社区活动问题": ["活动", "组织", "通知", "社区活动"],
    "信息公示不及时": ["公示", "公告", "通知", "信息", "透明"],
    "其他服务问题": ["服务", "管理", "投诉"],
    "物业费异议": ["物业费", "收费", "账单"],
    "停车费异议": ["停车费", "车位", "停车"],
    "水电费异议": ["水费", "电费", "水电费", "抄表"],
    "增值服务费异议": ["增值", "服务费", "维修费"],
    "退费问题": ["退费", "退款"],
    "其他收费争议": ["收费", "费用", "价格"],
    "保洁不到位": ["保洁", "卫生", "脏", "清洁"],
    "垃圾清运不及时": ["垃圾", "清运", "垃圾桶", "异味"],
    "消杀不到位": ["消杀", "蟑螂", "蚊", "虫", "鼠"],
    "绿化养护差": ["绿化", "草", "树", "修剪", "养护"],
    "公共区域异味": ["异味", "臭", "味道"],
    "其他环境问题": ["环境", "脏乱", "灰尘"],
    "外来人员管理不严": ["外来", "陌生人", "闲杂", "进出"],
    "车辆管理混乱": ["车辆", "乱停", "停车", "堵车"],
    "监控设备故障": ["监控", "摄像头", "录像"],
    "巡逻不到位": ["巡逻", "值守", "巡查"],
    "消防通道堵塞": ["消防通道", "堵塞", "占用"],
    "高空抛物": ["高空抛物", "抛物"],
    "其他安全问题": ["安全", "盗窃", "打架"],
    "噪音扰民": ["噪音", "扰民", "吵", "噪声"],
    "占用公共区域": ["占用", "公共区域", "堆放", "私占"],
    "宠物扰民": ["宠物", "狗", "猫", "扰民"],
    "其他邻里纠纷": ["邻里", "纠纷", "争吵"],
    "地产遗留问题": ["地产", "开发商", "遗留", "交付"],
    "其他无法归类问题": [],
}


_DEPT_BY_LV1: dict[str, str] = {
    "设施设备类": "工程部",
    "物业服务类": "客服部",
    "收费争议类": "财务部",
    "环境绿化类": "保洁部",
    "安全管理类": "秩序部",
    "邻里纠纷类": "项目管理部",
    "其他类": "项目管理部",
}


_HIGH_RISK_KEYWORDS = [
    "电梯困",
    "困在电梯",
    "漏电",
    "起火",
    "火灾",
    "燃气",
    "爆炸",
    "高空抛物",
    "盗窃",
    "打架",
    "停电",
    "断电",
    "爆管",
    "返水",
    "积水",
    "消防",
    "监控",
]


def _norm_text(v: str | None) -> str:
    return (v or "").strip()


def _count_occurrences(text: str, kw: str) -> int:
    if not kw:
        return 0
    return text.count(kw)


def _split_keywords(raw: str | None) -> list[str]:
    s = _norm_text(raw)
    if not s:
        return []
    for ch in ["，", ";", "；", "\n", "\t"]:
        s = s.replace(ch, ",")
    parts = [p.strip() for p in s.split(",")]
    return [p for p in parts if p]


def _select_category(text: str, db: Session | None = None) -> tuple[str, str, list[str], int]:
    if db is not None:
        rows = (
            db.execute(
                select(ComplaintCategoryLv1.name, ComplaintCategoryLv2.name, ComplaintCategoryLv2.keywords)
                .join(ComplaintCategoryLv2, ComplaintCategoryLv2.lv1_id == ComplaintCategoryLv1.id)
                .where(ComplaintCategoryLv1.is_enabled.is_(True), ComplaintCategoryLv2.is_enabled.is_(True))
                .order_by(ComplaintCategoryLv1.order_no.asc(), ComplaintCategoryLv2.order_no.asc())
            )
            .all()
        )
        if rows:
            scores: list[tuple[int, int, str, str, list[str]]] = []
            for lv1, lv2, keywords in rows:
                kws = _split_keywords(keywords)
                score = sum(_count_occurrences(text, kw) for kw in kws)
                tie = len(kws)
                scores.append((score, tie, lv1, lv2, kws))
            scores.sort(key=lambda x: (x[0], x[1]), reverse=True)
            best = scores[0] if scores else (0, 0, "其他类", "其他无法归类问题", [])
            if best[0] <= 0:
                return "其他类", "其他无法归类问题", [], 0
            return best[2], best[3], best[4], best[0]

    scores: list[tuple[int, int, str, str, list[str]]] = []
    for lv1, lv2_list in _CATEGORY_LV2_BY_LV1.items():
        for lv2 in lv2_list:
            kws = _CATEGORY_KEYWORDS.get(lv2, [])
            score = sum(_count_occurrences(text, kw) for kw in kws)
            tie = len(kws)
            scores.append((score, tie, lv1, lv2, kws))
    scores.sort(key=lambda x: (x[0], x[1]), reverse=True)
    best = scores[0] if scores else (0, 0, "其他类", "其他无法归类问题", [])
    if best[0] <= 0:
        return "其他类", "其他无法归类问题", [], 0
    return best[2], best[3], best[4], best[0]


def _extract_snippets(text: str, keywords: list[str]) -> list[dict[str, str]]:
    snippets: list[dict[str, str]] = []
    seen: set[str] = set()
    for kw in keywords:
        if not kw:
            continue
        for m in re.finditer(re.escape(kw), text):
            start = max(0, m.start() - 18)
            end = min(len(text), m.end() + 18)
            piece = text[start:end].strip()
            if not piece or piece in seen:
                continue
            seen.add(piece)
            snippets.append({"text": piece, "reason": f"命中关键词：{kw}"})
            if len(snippets) >= 3:
                return snippets
    if not snippets:
        head = text.strip()[:48]
        if head:
            snippets.append({"text": head, "reason": "原文摘要"})
    return snippets


def _calc_confidence(score: int, text: str) -> float:
    base = 0.45
    c = base + min(0.5, 0.08 * float(score))
    if len(text) < 10:
        c = min(c, 0.6)
    return max(0.0, min(1.0, float(c)))


def _risk_level(text: str, lv1: str, is_repeated: bool) -> str:
    if any(k in text for k in _HIGH_RISK_KEYWORDS):
        return "高"
    if lv1 in {"安全管理类"}:
        return "中" if not is_repeated else "高"
    if lv1 in {"收费争议类", "邻里纠纷类", "环境绿化类"}:
        return "中" if is_repeated else "中"
    return "中" if is_repeated else "低"


def _root_cause_templates(lv1: str, lv2: str) -> tuple[str, str, str]:
    surface = lv2
    if lv1 == "设施设备类":
        return surface, "设施维护与巡检不到位导致故障暴露", "设备全生命周期管理与维修闭环不完善"
    if lv1 == "物业服务类":
        return surface, "服务响应链路不顺畅导致体验受损", "服务标准与培训考核机制不足"
    if lv1 == "收费争议类":
        return surface, "费用口径与账务解释不足引发争议", "收费规则透明度与对账流程需要优化"
    if lv1 == "环境绿化类":
        return surface, "保洁与清运频次不匹配导致环境问题累积", "环境巡查标准与外包管理机制不足"
    if lv1 == "安全管理类":
        return surface, "安全巡查与门禁管控执行不到位", "安全制度落地与监督问责机制不足"
    if lv1 == "邻里纠纷类":
        return surface, "公共秩序协调与沟通介入不及时", "社区治理协同机制与纠纷预防机制不足"
    return surface, "问题归因信息不足，需补充事实核验", "需完善问题分类与处置知识库"


def _kb_split_keywords(raw: str | None) -> list[str]:
    s = _norm_text(raw)
    if not s:
        return []
    for ch in ["，", ";", "；", "\n", "\t"]:
        s = s.replace(ch, ",")
    parts = [p.strip() for p in s.split(",")]
    return [p for p in parts if p]


def _kb_best_for_level(db: Session, *, lv2: str, level: str, text: str, min_score: int) -> str | None:
    candidates = (
        db.execute(
            select(RootCauseKb)
            .where(
                RootCauseKb.is_enabled.is_(True),
                RootCauseKb.category_lv2 == lv2,
                RootCauseKb.level == level,
            )
            .order_by(RootCauseKb.updated_at.desc())
        )
        .scalars()
        .all()
    )
    if not candidates:
        return None

    scored: list[tuple[int, RootCauseKb]] = []
    for c in candidates:
        kws = _kb_split_keywords(c.keywords)
        score = sum(_count_occurrences(text, kw) for kw in kws) if kws else 0
        scored.append((score, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        return None
    if scored[0][0] < min_score:
        return None
    return scored[0][1].content


def _root_causes_from_kb(db: Session, *, lv1: str, lv2: str, text: str) -> tuple[str | None, str | None, str | None]:
    min_score = 1
    surface = _kb_best_for_level(db, lv2=lv2, level="surface", text=text, min_score=min_score)
    direct = _kb_best_for_level(db, lv2=lv2, level="direct", text=text, min_score=min_score)
    deep = _kb_best_for_level(db, lv2=lv2, level="deep", text=text, min_score=min_score)
    return surface, direct, deep


def _suggested_rectification(lv1: str, lv2: str, dept: str, risk: str, *, event_time: datetime | None) -> dict[str, str]:
    now = event_time or datetime.now(timezone.utc)
    days = 3 if risk == "高" else 7 if risk == "中" else 14
    deadline = now + timedelta(days=days)
    requirement = f"由{dept}牵头对“{lv2}”开展排查与处置，形成整改记录并回访确认"
    return {"requirement": requirement, "deadline": deadline.strftime("%Y-%m-%d %H:%M:%S")}


def _owner_key(record: DataRecord) -> tuple[str | None, str | None]:
    phone = _norm_text(record.phone)
    room = _norm_text(record.building_room)
    if phone and "*" not in phone:
        return "phone", phone
    if room and "*" not in room:
        return "room", room
    return None, None


def _is_repeated_complaint(db: Session, *, record: DataRecord, category_lv2: str) -> bool:
    settings = get_settings()
    key_type, key = _owner_key(record)
    if not key_type or not key:
        return False
    now = record.event_time if isinstance(record.event_time, datetime) else datetime.now(timezone.utc)
    start = now - timedelta(days=settings.analysis_repeat_window_days)
    key_clause = DataRecord.phone == key if key_type == "phone" else DataRecord.building_room == key

    prior = (
        db.execute(
            select(func.count())
            .select_from(ComplaintAnalysis)
            .join(DataRecord, ComplaintAnalysis.complaint_record_id == DataRecord.id)
            .where(
                and_(
                    DataRecord.data_type == DataType.COMPLAINT.value,
                    DataRecord.id != record.id,
                    DataRecord.event_time.is_not(None),
                    DataRecord.event_time >= start,
                    DataRecord.event_time <= now,
                    key_clause,
                    ComplaintAnalysis.category_lv2 == category_lv2,
                    ComplaintAnalysis.status.in_(["已分析", "需人工确认"]),
                )
            )
        )
        .scalar_one()
    )
    return int(prior) + 1 >= settings.analysis_repeat_threshold


def analyze_complaint_record(db: Session, *, record: DataRecord) -> AnalysisResult:
    settings = get_settings()
    text = _norm_text(record.cleaned_text) or _norm_text(record.raw_text)
    lv1, lv2, kws, score = _select_category(text, db=db)
    repeated = _is_repeated_complaint(db, record=record, category_lv2=lv2)
    dept = _DEPT_BY_LV1.get(lv1, "项目管理部")
    risk = _risk_level(text, lv1, repeated)
    kb_surface, kb_direct, kb_deep = _root_causes_from_kb(db, lv1=lv1, lv2=lv2, text=text)
    t_surface, t_direct, t_deep = _root_cause_templates(lv1, lv2)
    surface = kb_surface or t_surface
    direct = kb_direct or t_direct
    deep = kb_deep or t_deep
    evidence = _extract_snippets(text, kws)
    confidence = _calc_confidence(score, text)
    model_version = settings.analysis_model_version
    analyzed_at = datetime.now(timezone.utc)
    suggested = _suggested_rectification(lv1, lv2, dept, risk, event_time=record.event_time if isinstance(record.event_time, datetime) else None)
    return AnalysisResult(
        category_lv1=lv1,
        category_lv2=lv2,
        root_cause_surface=surface,
        root_cause_direct=direct,
        root_cause_deep=deep,
        responsible_dept=dept,
        risk_level=risk,
        is_repeated=repeated,
        confidence=confidence,
        evidence_snippets=evidence,
        suggested_rectification=suggested,
        model_version=model_version,
        analyzed_at=analyzed_at,
    )


def _to_ai_dict(result: AnalysisResult) -> dict[str, Any]:
    return {
        "category_lv1": result.category_lv1,
        "category_lv2": result.category_lv2,
        "root_cause_surface": result.root_cause_surface,
        "root_cause_direct": result.root_cause_direct,
        "root_cause_deep": result.root_cause_deep,
        "responsible_dept": result.responsible_dept,
        "risk_level": result.risk_level,
        "is_repeated": result.is_repeated,
        "confidence": result.confidence,
        "evidence_snippets": result.evidence_snippets,
        "suggested_rectification": result.suggested_rectification,
        "model_version": result.model_version,
        "analyzed_at": result.analyzed_at.isoformat(),
    }


def _apply_overlay(ai: dict[str, Any], override: dict[str, Any] | None) -> dict[str, Any]:
    if not override:
        return dict(ai)
    merged = dict(ai)
    for k, v in override.items():
        if v is not None:
            merged[k] = v
    return merged


def ensure_analysis_row(db: Session, *, record: DataRecord, actor_id: int | None) -> ComplaintAnalysis:
    existing = (
        db.execute(select(ComplaintAnalysis).where(ComplaintAnalysis.complaint_record_id == record.id))
        .scalars()
        .first()
    )
    if existing is not None:
        if record.work_order_no and not existing.work_order_no:
            existing.work_order_no = record.work_order_no
        return existing
    row = ComplaintAnalysis(
        id=new_id(),
        complaint_record_id=record.id,
        work_order_no=record.work_order_no,
        status="待分析",
        created_by=actor_id,
    )
    db.add(row)
    db.flush()
    return row


def _normalize_manual_override(payload: dict[str, Any]) -> dict[str, Any]:
    mapping = {
        "categoryLv1": "category_lv1",
        "categoryLv2": "category_lv2",
        "rootCauseSurface": "root_cause_surface",
        "rootCauseDirect": "root_cause_direct",
        "rootCauseDeep": "root_cause_deep",
        "department": "responsible_dept",
        "riskLevel": "risk_level",
        "isRepeatedComplaint": "is_repeated",
        "confidence": "confidence",
        "evidenceSnippets": "evidence_snippets",
        "suggestedRectification": "suggested_rectification",
    }
    normalized: dict[str, Any] = {}
    for k, v in payload.items():
        nk = mapping.get(k)
        if nk:
            normalized[nk] = v
    return normalized


def _set_row_from_dict(row: ComplaintAnalysis, data: dict[str, Any]) -> None:
    row.category_lv1 = data.get("category_lv1")
    row.category_lv2 = data.get("category_lv2")
    row.root_cause_surface = data.get("root_cause_surface")
    row.root_cause_direct = data.get("root_cause_direct")
    row.root_cause_deep = data.get("root_cause_deep")
    row.responsible_dept = data.get("responsible_dept")
    row.risk_level = data.get("risk_level")
    row.is_repeated = bool(data.get("is_repeated") or False)
    row.confidence = float(data.get("confidence") or 0.0)
    row.evidence_snippets = data.get("evidence_snippets")
    row.suggested_rectification = data.get("suggested_rectification")
    row.model_version = data.get("model_version")
    analyzed_at = data.get("analyzed_at")
    if isinstance(analyzed_at, str):
        try:
            row.analyzed_at = datetime.fromisoformat(analyzed_at.replace("Z", "+00:00"))
        except Exception:
            row.analyzed_at = datetime.now(timezone.utc)
    elif isinstance(analyzed_at, datetime):
        row.analyzed_at = analyzed_at


def _recompute_status(row: ComplaintAnalysis) -> None:
    settings = get_settings()
    if row.status == "分析失败":
        return
    if row.confidence < settings.analysis_confidence_threshold:
        row.status = "需人工确认"
        row.message = "置信度低于阈值"
        return
    row.status = "已分析"
    row.message = None


def persist_analysis_result(
    db: Session,
    *,
    row: ComplaintAnalysis,
    record: DataRecord,
    result: AnalysisResult,
    force_override: bool,
    actor: CurrentUser | None,
    task_id: str | None,
    action: str,
) -> None:
    before = {
        "status": row.status,
        "message": row.message,
        "manual_overridden": row.manual_overridden,
        "manual_override": row.manual_override,
        "category_lv1": row.category_lv1,
        "category_lv2": row.category_lv2,
        "risk_level": row.risk_level,
        "responsible_dept": row.responsible_dept,
    }

    ai = _to_ai_dict(result)
    row.ai_result = ai
    row.ai_confidence = result.confidence
    row.ai_model_version = result.model_version
    row.ai_analyzed_at = result.analyzed_at

    override = row.manual_override if (row.manual_overridden and not force_override) else None
    if force_override and row.manual_overridden:
        row.manual_override = None
        row.manual_overridden = False
        row.manual_overridden_by = None
        row.manual_overridden_at = None
        row.manual_override_reason = None

    effective = _apply_overlay(ai, override)
    _set_row_from_dict(row, effective)
    _recompute_status(row)

    before_record_status = record.status
    record.status = DataStatus.ANALYZED.value

    create_audit_log(
        db,
        entity_type="complaint_analysis",
        entity_id=row.id,
        action=action,
        actor=actor,
        before={**before, "record_status": before_record_status},
        after={
            "status": row.status,
            "message": row.message,
            "confidence": row.confidence,
            "category_lv1": row.category_lv1,
            "category_lv2": row.category_lv2,
            "risk_level": row.risk_level,
            "responsible_dept": row.responsible_dept,
            "task_id": task_id,
            "force_override": force_override,
        },
        source="task" if task_id else "api",
    )


def override_analysis(
    db: Session,
    *,
    analysis_id: str,
    patch: dict[str, Any],
    reason: str | None,
    actor: CurrentUser | None,
) -> ComplaintAnalysis:
    row = db.get(ComplaintAnalysis, analysis_id)
    if row is None:
        raise AppError(code="NOT_FOUND", msg="分析记录不存在", status_code=404)
    if not isinstance(row.ai_result, dict):
        raise AppError(code="INVALID_STATE", msg="尚未产生AI分析结果，无法修正", status_code=400)

    normalized = _normalize_manual_override(patch)
    if not normalized:
        raise AppError(code="EMPTY_PATCH", msg="修正内容不能为空", status_code=400)

    before = {
        "category_lv1": row.category_lv1,
        "category_lv2": row.category_lv2,
        "responsible_dept": row.responsible_dept,
        "risk_level": row.risk_level,
        "is_repeated": row.is_repeated,
        "confidence": row.confidence,
        "manual_override": row.manual_override,
        "manual_overridden": row.manual_overridden,
    }

    merged_override = dict(row.manual_override or {})
    merged_override.update({k: v for k, v in normalized.items()})
    row.manual_override = merged_override
    row.manual_overridden = True
    row.manual_overridden_by = actor.id if actor else None
    row.manual_overridden_at = datetime.now(timezone.utc)
    row.manual_override_reason = reason

    effective = _apply_overlay(dict(row.ai_result), merged_override)
    _set_row_from_dict(row, effective)
    _recompute_status(row)

    create_audit_log(
        db,
        entity_type="complaint_analysis",
        entity_id=row.id,
        action="ANALYSIS_OVERRIDE",
        actor=actor,
        before=before,
        after={
            "category_lv1": row.category_lv1,
            "category_lv2": row.category_lv2,
            "responsible_dept": row.responsible_dept,
            "risk_level": row.risk_level,
            "is_repeated": row.is_repeated,
            "confidence": row.confidence,
            "manual_override": row.manual_override,
            "manual_overridden": row.manual_overridden,
        },
        reason=reason,
    )
    return row


def run_analysis_task(
    *,
    task_id: str,
    record_ids: list[str] | None,
    work_order_nos: list[str] | None,
    force_override: bool,
    actor_id: int | None,
) -> None:
    update_task_progress(None, task_id=task_id, status=TaskStatus.RUNNING, progress=0, message="开始分析")
    with SessionLocal() as db:
        actor = load_actor_stub(db, actor_id)
        try:
            stmt = select(DataRecord).where(DataRecord.data_type == DataType.COMPLAINT.value)
            if record_ids:
                stmt = stmt.where(DataRecord.id.in_(record_ids))
            if work_order_nos:
                stmt = stmt.where(DataRecord.work_order_no.in_([w.strip() for w in work_order_nos if w.strip()]))
            if not record_ids and not work_order_nos:
                stmt = stmt.where(DataRecord.status.in_([DataStatus.CLEANED.value, DataStatus.LINKED.value, DataStatus.MATCH_FAILED.value]))

            rows = db.execute(stmt.order_by(DataRecord.created_at.asc())).scalars().all()
            total = len(rows)
            if total == 0:
                update_task_progress(None, task_id=task_id, status=TaskStatus.SUCCESS, progress=100, message="没有需要分析的数据")
                return

            for i, record in enumerate(rows, start=1):
                analysis_row = ensure_analysis_row(db, record=record, actor_id=actor_id)
                res = analyze_complaint_record(db, record=record)
                persist_analysis_result(
                    db,
                    row=analysis_row,
                    record=record,
                    result=res,
                    force_override=force_override,
                    actor=actor,
                    task_id=task_id,
                    action="ANALYSIS_RUN",
                )
                if i % 20 == 0:
                    db.flush()
                pct = int(100 * i / max(1, total))
                update_task_progress(None, task_id=task_id, progress=pct, message=f"已分析{i}/{total}")

            db.commit()
            create_audit_log(
                db,
                entity_type="task",
                entity_id=task_id,
                action="ANALYSIS_FINISH",
                actor=actor,
                after={"count": total, "force_override": force_override},
                source="task",
            )
            db.commit()
            update_task_progress(None, task_id=task_id, status=TaskStatus.SUCCESS, progress=100, message=f"分析完成：{total}条")
        except AppError as e:
            db.rollback()
            update_task_progress(None, task_id=task_id, status=TaskStatus.FAILURE, progress=100, message=e.msg)
        except Exception as e:
            db.rollback()
            update_task_progress(None, task_id=task_id, status=TaskStatus.FAILURE, progress=100, message=f"分析失败：{e}")


def rerun_analysis_task(*, task_id: str, analysis_id: str, force_override: bool, actor_id: int | None) -> None:
    update_task_progress(None, task_id=task_id, status=TaskStatus.RUNNING, progress=0, message="开始重新分析")
    with SessionLocal() as db:
        actor = load_actor_stub(db, actor_id)
        try:
            row = db.get(ComplaintAnalysis, analysis_id)
            if row is None:
                raise AppError(code="NOT_FOUND", msg="分析记录不存在", status_code=404)
            record = db.get(DataRecord, row.complaint_record_id)
            if record is None:
                raise AppError(code="NOT_FOUND", msg="关联投诉数据不存在", status_code=404)
            res = analyze_complaint_record(db, record=record)
            persist_analysis_result(
                db,
                row=row,
                record=record,
                result=res,
                force_override=force_override,
                actor=actor,
                task_id=task_id,
                action="ANALYSIS_RERUN",
            )
            db.commit()
            create_audit_log(
                db,
                entity_type="task",
                entity_id=task_id,
                action="ANALYSIS_RERUN_FINISH",
                actor=actor,
                after={"analysis_id": analysis_id, "force_override": force_override},
                source="task",
            )
            db.commit()
            update_task_progress(None, task_id=task_id, status=TaskStatus.SUCCESS, progress=100, message="重新分析完成")
        except AppError as e:
            db.rollback()
            update_task_progress(None, task_id=task_id, status=TaskStatus.FAILURE, progress=100, message=e.msg)
        except Exception as e:
            db.rollback()
            update_task_progress(None, task_id=task_id, status=TaskStatus.FAILURE, progress=100, message=f"重新分析失败：{e}")
