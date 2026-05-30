from rest_framework import serializers


class ChatbotRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1000)


class ChatbotResponseSerializer(serializers.Serializer):
    answer = serializers.CharField()
    actions = serializers.ListField(child=serializers.DictField(), required=False)
