from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.core.errors import AppError
from app.models.qa import QaRecord
from app.models.rbac import Department
from app.services.audit import create_audit_log
from app.services.metrics_dashboard import (
    DashboardFilters,
    get_category_distribution,
    get_overview,
    get_root_cause_top,
    get_trend,
    get_workorder_closure,
)


def new_id() -> str:
    return uuid.uuid4().hex


_DEPT_NAMES = ["工程部", "保洁部", "客服部", "秩序部", "财务部", "项目管理部", "地产维保部"]
_CATEGORY_LV1 = ["设施设备类", "物业服务类", "收费争议类", "环境绿化类", "安全管理类", "邻里纠纷类", "其他类"]


@dataclass(frozen=True)
class QaPlan:
    metric: str
    start_time: datetime | None
    end_time: datetime | None
    dept_name: str | None
    category: str | None
    level: str | None
    limit: int | None

    def to_dsl(self) -> dict[str, Any]:
        return {
            "metric": self.metric,
            "range": {
                "startTime": self.start_time.isoformat() if self.start_time else None,
                "endTime": self.end_time.isoformat() if self.end_time else None,
            },
            "filters": {
                "deptName": self.dept_name,
                "category": self.category,
                "level": self.level,
            },
            "limit": self.limit,
        }


def _month_range(ref: datetime, offset_months: int) -> tuple[datetime, datetime]:
    y = ref.year
    m = ref.month + offset_months
    while m <= 0:
        y -= 1
        m += 12
    while m > 12:
        y += 1
        m -= 12
    start = datetime(y, m, 1, tzinfo=timezone.utc)
    if m == 12:
        end = datetime(y + 1, 1, 1, tzinfo=timezone.utc) - timedelta(seconds=1)
    else:
        end = datetime(y, m + 1, 1, tzinfo=timezone.utc) - timedelta(seconds=1)
    return start, end


def _week_range(ref: datetime, offset_weeks: int) -> tuple[datetime, datetime]:
    base = ref - timedelta(days=ref.weekday())
    base = base.replace(hour=0, minute=0, second=0, microsecond=0)
    start = base + timedelta(weeks=offset_weeks)
    end = start + timedelta(days=7) - timedelta(seconds=1)
    return start, end


def _parse_time_range(question: str) -> tuple[datetime | None, datetime | None]:
    now = datetime.now(timezone.utc)
    q = question
    if "本月" in q:
        return _month_range(now, 0)[0], now
    if "上月" in q or "上个月" in q:
        start, end = _month_range(now, -1)
        return start, end
    if "本周" in q:
        start, _ = _week_range(now, 0)
        return start, now
    if "上周" in q:
        start, end = _week_range(now, -1)
        return start, end
    if "今天" in q:
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start, now
    if "昨天" in q:
        start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1) - timedelta(seconds=1)
        return start, end
    if "今年" in q:
        start = datetime(now.year, 1, 1, tzinfo=timezone.utc)
        return start, now
    m = re.search(r"(近|最近|过去)\s*(\d{1,3})\s*天", q)
    if m:
        days = int(m.group(2))
        days = max(1, min(3650, days))
        start = now - timedelta(days=days)
        return start, now
    return None, None


def _parse_dept_name(question: str) -> str | None:
    for name in _DEPT_NAMES:
        if name in question:
            return name
    return None


def _parse_category(question: str) -> str | None:
    for name in _CATEGORY_LV1:
        if name in question:
            return name
    return None


def _parse_level(question: str) -> str | None:
    if "表层" in question:
        return "surface"
    if "直接" in question:
        return "direct"
    if "深层" in question or "深度" in question:
        return "deep"
    return None


def _parse_limit(question: str, default: int | None = None) -> int | None:
    m = re.search(r"(top|TOP)\s*(\d{1,3})", question)
    if m:
        return max(1, min(200, int(m.group(2))))
    m = re.search(r"前\s*(\d{1,3})\s*个", question)
    if m:
        return max(1, min(200, int(m.group(1))))
    return default


def _parse_metric(question: str) -> str:
    q = question
    if ("根因" in q or "原因" in q) and ("最多" in q or "top" in q.lower() or "最高" in q):
        return "root_cause_top"
    if "分类" in q and ("分布" in q or "占比" in q):
        return "category_distribution"
    if "趋势" in q or "走势" in q:
        return "trend"
    if "闭环" in q and ("完成率" in q or "闭环率" in q or "状态" in q):
        return "workorder_closure"
    if "逾期" in q or "超时" in q:
        return "overdue_workorders"
    if "重复投诉率" in q or "重复率" in q:
        return "repeat_rate"
    if "满意度" in q or "评分" in q:
        return "satisfaction_avg"
    return "overview"


def plan_question(question: str) -> QaPlan:
    q = (question or "").strip()
    if not q:
        raise AppError(code="EMPTY_QUESTION", msg="问题不能为空", status_code=400)
    start, end = _parse_time_range(q)
    metric = _parse_metric(q)
    dept = _parse_dept_name(q)
    category = _parse_category(q)
    level = _parse_level(q)
    limit = _parse_limit(q, default=10 if metric in {"root_cause_top", "category_distribution"} else None)
    return QaPlan(metric=metric, start_time=start, end_time=end, dept_name=dept, category=category, level=level, limit=limit)


def _resolve_dept_id(db: Session, dept_name: str) -> int | None:
    row = db.execute(select(Department).where(and_(Department.name == dept_name, Department.is_active.is_(True)))).scalars().first()
    return int(row.id) if row else None


def _human_range(plan: QaPlan) -> str:
    if plan.start_time and plan.end_time:
        return f"{plan.start_time.strftime('%Y-%m-%d')}至{plan.end_time.strftime('%Y-%m-%d')}"
    if plan.start_time and not plan.end_time:
        return f"{plan.start_time.strftime('%Y-%m-%d')}至今"
    return "默认近30天"


def _conclude_overview(plan: QaPlan, data: dict[str, Any]) -> str:
    total = data.get("totalComplaints")
    repeat_rate = data.get("repeatRate")
    overdue = data.get("overdueWorkOrders")
    sat = data.get("satisfactionAvg")
    dept = data.get("range", {}).get("deptName") or plan.dept_name
    category = data.get("range", {}).get("category") or plan.category
    parts = [f"统计范围：{_human_range(plan)}"]
    if dept:
        parts.append(f"部门：{dept}")
    if category:
        parts.append(f"分类：{category}")
    parts.append(f"投诉总量：{total}")
    if repeat_rate is not None:
        parts.append(f"重复投诉率：{round(float(repeat_rate) * 100, 2)}%")
    if overdue is not None:
        parts.append(f"逾期工单数：{overdue}")
    if sat is not None:
        parts.append(f"满意度均分：{sat}")
    return "；".join([p for p in parts if p is not None])


def _conclude_root_cause_top(plan: QaPlan, data: dict[str, Any]) -> str:
    items = data.get("items") if isinstance(data, dict) else None
    if not isinstance(items, list) or not items:
        return f"统计范围：{_human_range(plan)}；未检索到根因数据"
    top = items[0]
    name = str(top.get("name") or "-")
    count = int(top.get("count") or 0)
    level_map = {"surface": "表层问题", "direct": "直接原因", "deep": "深层管理根因"}
    level_name = level_map.get(str(data.get("level") or ""), "深层管理根因")
    dept = data.get("range", {}).get("deptName") or plan.dept_name
    category = data.get("range", {}).get("category") or plan.category
    parts = [f"统计范围：{_human_range(plan)}", f"{level_name}TOP1：{name}（{count}次）"]
    if dept:
        parts.append(f"部门：{dept}")
    if category:
        parts.append(f"分类：{category}")
    return "；".join(parts)


def _conclude_category_distribution(plan: QaPlan, data: dict[str, Any]) -> str:
    items = data.get("items") if isinstance(data, dict) else None
    if not isinstance(items, list) or not items:
        return f"统计范围：{_human_range(plan)}；未检索到分类分布数据"
    top = items[0]
    name = str(top.get("name") or "-")
    count = int(top.get("count") or 0)
    ratio = top.get("ratio")
    ratio_text = f"{round(float(ratio) * 100, 2)}%" if isinstance(ratio, (float, int)) else "-"
    dept = data.get("range", {}).get("deptName") or plan.dept_name
    parts = [f"统计范围：{_human_range(plan)}", f"投诉最多分类：{name}（{count}条，占比{ratio_text}）"]
    if dept:
        parts.append(f"部门：{dept}")
    return "；".join(parts)


def _conclude_trend(plan: QaPlan, data: dict[str, Any]) -> str:
    points = data.get("points") if isinstance(data, dict) else None
    if not isinstance(points, list) or not points:
        return f"统计范围：{_human_range(plan)}；未检索到趋势数据"
    total = sum(int(p.get("complaintCount") or 0) for p in points if isinstance(p, dict))
    peak = max(points, key=lambda p: int(p.get("complaintCount") or 0))
    peak_date = peak.get("date")
    peak_cnt = int(peak.get("complaintCount") or 0)
    dept = data.get("range", {}).get("deptName") or plan.dept_name
    category = data.get("range", {}).get("category") or plan.category
    parts = [f"统计范围：{_human_range(plan)}", f"期间投诉总量：{total}", f"峰值日期：{peak_date}（{peak_cnt}条）"]
    if dept:
        parts.append(f"部门：{dept}")
    if category:
        parts.append(f"分类：{category}")
    return "；".join(parts)


def _conclude_workorder_closure(plan: QaPlan, data: dict[str, Any]) -> str:
    total = data.get("total")
    closed = data.get("closed")
    overdue = data.get("overdue")
    close_rate = data.get("closeRate")
    rate_text = f"{round(float(close_rate) * 100, 2)}%" if isinstance(close_rate, (float, int)) else "-"
    dept = data.get("range", {}).get("deptName") or plan.dept_name
    parts = [f"统计范围：{_human_range(plan)}", f"工单总量：{total}", f"已闭环：{closed}", f"逾期：{overdue}", f"闭环率：{rate_text}"]
    if dept:
        parts.append(f"部门：{dept}")
    return "；".join(parts)


def execute_plan(db: Session, plan: QaPlan, actor: CurrentUser) -> tuple[QaPlan, str, Any, str]:
    dept_id = _resolve_dept_id(db, plan.dept_name) if plan.dept_name else None
    start_time = plan.start_time
    end_time = plan.end_time
    if start_time is None or end_time is None:
        now = datetime.now(timezone.utc)
        start_time = start_time or (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_time = end_time or now
    if start_time and end_time and start_time > end_time:
        start_time, end_time = end_time, start_time
    effective_plan = QaPlan(
        metric=plan.metric,
        start_time=start_time,
        end_time=end_time,
        dept_name=plan.dept_name,
        category=plan.category,
        level=plan.level,
        limit=plan.limit,
    )
    filters = DashboardFilters(start_time=start_time, end_time=end_time, dept_id=dept_id, category=plan.category)

    if effective_plan.metric == "root_cause_top":
        level = effective_plan.level or "deep"
        data = get_root_cause_top(db, filters=filters, actor=actor, level=level, limit=effective_plan.limit or 10)
        return effective_plan, effective_plan.metric, data, _conclude_root_cause_top(effective_plan, data)

    if effective_plan.metric == "category_distribution":
        data = get_category_distribution(db, filters=filters, actor=actor, limit=effective_plan.limit or 20)
        return effective_plan, effective_plan.metric, data, _conclude_category_distribution(effective_plan, data)

    if effective_plan.metric == "trend":
        data = get_trend(db, filters=filters, actor=actor)
        return effective_plan, effective_plan.metric, data, _conclude_trend(effective_plan, data)

    if effective_plan.metric == "workorder_closure":
        data = get_workorder_closure(db, filters=filters, actor=actor)
        return effective_plan, effective_plan.metric, data, _conclude_workorder_closure(effective_plan, data)

    if effective_plan.metric == "overdue_workorders":
        data = get_overview(db, filters=filters, actor=actor)
        data = dict(data)
        data["focus"] = "overdueWorkOrders"
        return effective_plan, effective_plan.metric, data, _conclude_overview(effective_plan, data)

    if effective_plan.metric == "repeat_rate":
        data = get_overview(db, filters=filters, actor=actor)
        data = dict(data)
        data["focus"] = "repeatRate"
        return effective_plan, effective_plan.metric, data, _conclude_overview(effective_plan, data)

    if effective_plan.metric == "satisfaction_avg":
        data = get_overview(db, filters=filters, actor=actor)
        data = dict(data)
        data["focus"] = "satisfactionAvg"
        return effective_plan, effective_plan.metric, data, _conclude_overview(effective_plan, data)

    data = get_overview(db, filters=filters, actor=actor)
    return effective_plan, "overview", data, _conclude_overview(effective_plan, data)


def run_qa(db: Session, *, question: str, actor: CurrentUser) -> QaRecord:
    plan = plan_question(question)
    effective_plan, metric, result, conclusion = execute_plan(db, plan, actor)
    record = create_qa_record(
        db,
        question=question,
        plan=effective_plan,
        metric=metric,
        result=result,
        conclusion=conclusion,
        actor=actor,
    )
    return record


def create_qa_record(db: Session, *, question: str, plan: QaPlan, metric: str, result: Any, conclusion: str | None, actor: CurrentUser) -> QaRecord:
    record = QaRecord(
        id=new_id(),
        question=question,
        dsl=plan.to_dsl(),
        metric=metric,
        result=result if isinstance(result, (dict, list)) else {"value": result},
        conclusion=conclusion,
        created_by=actor.id,
    )
    db.add(record)
    create_audit_log(
        db,
        entity_type="qa",
        entity_id=record.id,
        action="QA_ASK",
        actor=actor,
        after={"question": question, "dsl": record.dsl, "metric": metric},
    )
    return record


def get_qa_record(db: Session, *, record_id: str, actor: CurrentUser) -> QaRecord:
    row = db.get(QaRecord, record_id)
    if row is None or row.created_by != actor.id:
        raise AppError(code="NOT_FOUND", msg="问答记录不存在", status_code=404)
    return row


def list_qa_records(
    db: Session,
    *,
    actor: CurrentUser,
    page: int,
    size: int,
    favorite_only: bool,
) -> tuple[list[QaRecord], int]:
    page = max(1, page)
    size = max(1, min(200, size))
    stmt = select(QaRecord).where(QaRecord.created_by == actor.id)
    if favorite_only:
        stmt = stmt.where(QaRecord.is_favorite.is_(True))
    total = int(db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one() or 0)
    rows = (
        db.execute(stmt.order_by(QaRecord.created_at.desc()).offset((page - 1) * size).limit(size))
        .scalars()
        .all()
    )
    return rows, total


def set_favorite(db: Session, *, record_id: str, favorite: bool, actor: CurrentUser) -> QaRecord:
    row = get_qa_record(db, record_id=record_id, actor=actor)
    before = {"is_favorite": bool(row.is_favorite), "favorited_at": row.favorited_at.isoformat() if row.favorited_at else None}
    row.is_favorite = bool(favorite)
    row.favorited_at = datetime.now(timezone.utc) if row.is_favorite else None
    create_audit_log(
        db,
        entity_type="qa",
        entity_id=row.id,
        action="QA_FAVORITE" if favorite else "QA_UNFAVORITE",
        actor=actor,
        before=before,
        after={"is_favorite": bool(row.is_favorite), "favorited_at": row.favorited_at.isoformat() if row.favorited_at else None},
    )
    return row


def export_qa_record_text(row: QaRecord) -> str:
    lines = []
    lines.append(f"问答ID：{row.id}")
    lines.append(f"提问：{row.question}")
    lines.append(f"指标：{row.metric or '-'}")
    lines.append(f"时间：{row.created_at.isoformat() if isinstance(row.created_at, datetime) else '-'}")
    lines.append("DSL：")
    if row.dsl is not None:
        lines.append(json.dumps(row.dsl, ensure_ascii=False, indent=2))
    else:
        lines.append("-")
    if row.conclusion:
        lines.append("结论：")
        lines.append(str(row.conclusion))
    lines.append("数据：")
    if row.result is not None:
        lines.append(json.dumps(row.result, ensure_ascii=False, indent=2))
    else:
        lines.append("-")
    return "\n".join(lines).strip() + "\n"


def export_qa_record_json(row: QaRecord) -> dict[str, Any]:
    return {
        "id": row.id,
        "question": row.question,
        "metric": row.metric,
        "dsl": row.dsl,
        "result": row.result,
        "conclusion": row.conclusion,
        "isFavorite": bool(row.is_favorite),
        "createdAt": row.created_at.isoformat() if isinstance(row.created_at, datetime) else None,
    }
