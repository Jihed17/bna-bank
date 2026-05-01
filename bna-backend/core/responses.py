from rest_framework import status as http_status
from rest_framework.response import Response


def success(data=None, status: int = http_status.HTTP_200_OK) -> Response:
    """Wrap data in the standard success envelope: {"data": ...}."""
    return Response({'data': data}, status=status)


def created(data=None) -> Response:
    return success(data=data, status=http_status.HTTP_201_CREATED)


def no_content() -> Response:
    return Response(status=http_status.HTTP_204_NO_CONTENT)
