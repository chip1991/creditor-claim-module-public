from typing import Any

from pydantic import BaseModel


class ApiResponse(BaseModel):
    code: str = "OK"
    msg: str = "成功"
    data: Any = None


class ApiError(BaseModel):
    code: str
    msg: str
