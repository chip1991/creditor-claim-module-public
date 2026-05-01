from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_admin_or_permissions, require_permissions
from app.core.response import ApiResponse
from app.db.session import get_db
from app.schemas.system_config import SystemConfigSaveRequest
from app.schemas.workorder_warning import WorkOrderWarningRuleSaveRequest
from app.services.audit import create_audit_log
from app.services.system_config import get_system_config_payload, save_system_config
from app.services.workorder_warning import get_workorder_warning_rule, save_workorder_warning_rule, scan_workorder_warning


router = APIRouter()


def _rule_to_payload(rule) -> dict:
    return {
        "warningHours": int(rule.warning_hours),
        "escalationWorkdays": int(rule.escalation_workdays),
        "dayBasis": rule.day_basis,
        "holidayCalendar": rule.holiday_calendar,
    }


@router.get("/system/rules/workorder-warning", response_model=ApiResponse)
def system_workorder_warning_rule_get(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("system:rules")),
) -> ApiResponse:
    rule = get_workorder_warning_rule(db)
    return ApiResponse(data={"rule": _rule_to_payload(rule)})


@router.post("/system/rules/workorder-warning", response_model=ApiResponse)
def system_workorder_warning_rule_save(
    payload: WorkOrderWarningRuleSaveRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("system:rules")),
) -> ApiResponse:
    rule = save_workorder_warning_rule(db, payload=payload.rule.model_dump(), actor=current_user)
    db.commit()
    return ApiResponse(data={"rule": _rule_to_payload(rule)})


@router.post("/system/scheduler/workorder-warning-scan", response_model=ApiResponse)
def system_workorder_warning_scan(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("system:scheduler")),
) -> ApiResponse:
    result = scan_workorder_warning(db, actor=current_user, source="api")
    create_audit_log(
        db,
        entity_type="system_scheduler",
        entity_id="workorder_warning_scan",
        action="SYSTEM_SCHEDULER_TRIGGER",
        actor=current_user,
        after=result,
        reason="手动触发工单预警扫描",
        source="api",
    )
    db.commit()
    return ApiResponse(data=result)


def _config_response(payload: dict) -> ApiResponse:
    return ApiResponse(
        data={
            "key": payload.get("key"),
            "value": payload.get("value", ""),
            "version": int(payload.get("version") or 0),
            "enabled": bool(payload.get("enabled", True)),
        }
    )


@router.get("/system/category/get", response_model=ApiResponse)
def system_category_get(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("system:config")),
) -> ApiResponse:
    return _config_response(get_system_config_payload(db, key="category"))


@router.post("/system/category/save", response_model=ApiResponse)
def system_category_save(
    payload: SystemConfigSaveRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("system:config")),
) -> ApiResponse:
    saved = save_system_config(db, key="category", value=payload.value, enabled=payload.enabled, actor=current_user, reason="保存投诉分类配置")
    db.commit()
    return _config_response(saved)


@router.get("/system/knowledge/get", response_model=ApiResponse)
def system_knowledge_get(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("system:config")),
) -> ApiResponse:
    return _config_response(get_system_config_payload(db, key="knowledge"))


@router.post("/system/knowledge/save", response_model=ApiResponse)
def system_knowledge_save(
    payload: SystemConfigSaveRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("system:config")),
) -> ApiResponse:
    saved = save_system_config(db, key="knowledge", value=payload.value, enabled=payload.enabled, actor=current_user, reason="保存根因知识库配置")
    db.commit()
    return _config_response(saved)


@router.get("/system/permission/get", response_model=ApiResponse)
def system_permission_get(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("system:config")),
) -> ApiResponse:
    return _config_response(get_system_config_payload(db, key="permission"))


@router.post("/system/permission/save", response_model=ApiResponse)
def system_permission_save(
    payload: SystemConfigSaveRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("system:config")),
) -> ApiResponse:
    saved = save_system_config(db, key="permission", value=payload.value, enabled=payload.enabled, actor=current_user, reason="保存部门与权限配置")
    db.commit()
    return _config_response(saved)


@router.get("/system/rules/get", response_model=ApiResponse)
def system_rules_get(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("system:config")),
) -> ApiResponse:
    return _config_response(get_system_config_payload(db, key="rules"))


@router.post("/system/rules/save", response_model=ApiResponse)
def system_rules_save(
    payload: SystemConfigSaveRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("system:config")),
) -> ApiResponse:
    saved = save_system_config(db, key="rules", value=payload.value, enabled=payload.enabled, actor=current_user, reason="保存智能体规则配置")
    db.commit()
    return _config_response(saved)
