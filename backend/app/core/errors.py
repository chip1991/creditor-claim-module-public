class AppError(Exception):
    def __init__(self, code: str, msg: str, status_code: int = 400) -> None:
        self.code = code
        self.msg = msg
        self.status_code = status_code
        super().__init__(msg)
