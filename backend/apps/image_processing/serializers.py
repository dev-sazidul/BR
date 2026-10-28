from rest_framework import serializers


class RemoveBackgroundSerializer(serializers.Serializer):
    image = serializers.FileField(
        error_messages={
            "required": "Choose an image to upload.",
            "empty": "That file is empty.",
            "invalid": "The upload could not be read.",
        }
    )


class RemovalResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    original_filename = serializers.CharField()
    width = serializers.IntegerField()
    height = serializers.IntegerField()
    output_format = serializers.CharField()
    result_url = serializers.CharField()
    download_url = serializers.CharField()
    expires_at = serializers.DateTimeField()


class ErrorBodySerializer(serializers.Serializer):
    code = serializers.CharField()
    message = serializers.CharField()
    details = serializers.DictField()


class ErrorResponseSerializer(serializers.Serializer):
    error = ErrorBodySerializer()
