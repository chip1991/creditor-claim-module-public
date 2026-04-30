from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class WorkOrderWarningRulePayload(BaseModel):
    warningHours: int
    escalationWorkdays: int
    dayBasis: str
    holidayCalendar: Any | None = None


class WorkOrderWarningRuleGetResponse(BaseModel):
    rule: WorkOrderWarningRulePayload


class WorkOrderWarningRuleSaveRequest(BaseModel):
    rule: WorkOrderWarningRulePayload


class WorkOrderWarningScanResponse(BaseModel):
    scanned: int
    warningStatusUpdated: int
    closeStatusUpdated: int
    notifiedSoon: int
    notifiedOverdue: int
    escalated: int
    calendarEnabled: bool
