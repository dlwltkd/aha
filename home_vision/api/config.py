from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the API gateway."""

    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8080)

    database_url: str = Field(
        default="sqlite+aiosqlite:///./events.db",
        description="SQLAlchemy-compatible database URL."
    )

    mqtt_host: str = Field(default="localhost")
    mqtt_port: int = Field(default=1883)
    mqtt_username: str | None = None
    mqtt_password: str | None = None
    mqtt_client_id: str = Field(default="homevision_api")
    mqtt_events_topic: str = Field(default="events/#")
    mqtt_presence_topics: list[str] = Field(default_factory=lambda: ["vision/state/living_room"])
    mqtt_command_template: str = Field(default="cmd/lighting/{room}/set")

    allowed_rooms: list[str] = Field(
        default_factory=lambda: ["bedroom", "bathroom", "living", "entrance"]
    )
    initial_broadcast_limit: int = Field(default=25, ge=0)

    log_level: str = Field(default="INFO")

    model_config = SettingsConfigDict(env_file=".env", env_prefix="HOME_VISION_", extra="ignore")
