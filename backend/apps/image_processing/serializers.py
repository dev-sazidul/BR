from rest_framework import serializers


class RemoveBackgroundSerializer(serializers.Serializer):
    image = serializers.FileField(
        help_text="One PNG, JPEG, or WebP file. The server checks the bytes, not only the extension.",
        error_messages={
            "required": "Choose an image to upload.",
            "empty": "That file is empty.",
            "invalid": "The upload could not be read.",
        },
    )


class RemovalResponseSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="Random id for this result. It is not a database key.")
    original_filename = serializers.CharField(help_text="Sanitized name of the uploaded file.")
    width = serializers.IntegerField()
    height = serializers.IntegerField()
    output_format = serializers.CharField(help_text="Always png. JPEG is produced by the download endpoint.")
    result_url = serializers.CharField(help_text="Signed path for an inline transparent PNG.")
    download_url = serializers.CharField(help_text="Signed path for a file download. Add format and background there.")
    expires_at = serializers.DateTimeField(help_text="When the signed links stop working.")


class AiStatusSerializer(serializers.Serializer):
    provider = serializers.CharField()
    model = serializers.CharField(allow_null=True)
    available = serializers.BooleanField(help_text="False means removal will fail instead of returning the original.")
    model_cached = serializers.BooleanField()
    detail = serializers.CharField()


class HealthResponseSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["ok", "degraded"])
    service = serializers.CharField()
    ai = AiStatusSerializer()


class ConfigResponseSerializer(serializers.Serializer):
    max_upload_bytes = serializers.IntegerField()
    max_dimension_px = serializers.IntegerField()
    supported_formats = serializers.ListField(child=serializers.CharField())
    output_formats = serializers.ListField(child=serializers.CharField())
    retention_minutes = serializers.IntegerField()
    ai_provider = serializers.CharField()
    ai_model = serializers.CharField(allow_null=True)
    contact_email = serializers.CharField(allow_null=True)


class ErrorBodySerializer(serializers.Serializer):
    code = serializers.CharField()
    message = serializers.CharField()
    details = serializers.DictField()


class ErrorResponseSerializer(serializers.Serializer):
    error = ErrorBodySerializer()
