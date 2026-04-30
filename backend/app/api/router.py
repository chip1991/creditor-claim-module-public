from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.data import router as data_router
from app.api.analysis import router as analysis_router
from app.api.notification import router as notification_router
from app.api.task import router as task_router
from app.api.workorder import router as workorder_router
from app.api.system import router as system_router
from app.api.dashboard import router as dashboard_router
from app.api.qa import router as qa_router
from app.api.report import router as report_router
from app.api.iam import router as iam_router
from app.api.rbac import router as rbac_router
from app.api.v1_compat import router as v1_compat_router
from app.api.ai import router as ai_router
from app.api.root_cause_kb import router as root_cause_kb_router
from app.api.complaint_category import router as complaint_category_router


api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(data_router)
api_router.include_router(analysis_router)
api_router.include_router(notification_router)
api_router.include_router(task_router)
api_router.include_router(workorder_router)
api_router.include_router(system_router)
api_router.include_router(dashboard_router)
api_router.include_router(qa_router)
api_router.include_router(report_router)
api_router.include_router(v1_compat_router)
api_router.include_router(iam_router)
api_router.include_router(rbac_router)
api_router.include_router(ai_router)
api_router.include_router(root_cause_kb_router)
api_router.include_router(complaint_category_router)
