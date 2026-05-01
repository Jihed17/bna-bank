from django.http import JsonResponse
from django.urls import path


def health(request):
    return JsonResponse({'status': 'ok', 'version': '1.0.0'})


urlpatterns = [path('', health)]
