import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text  # noqa: E402

from app.core.config import get_settings  # noqa: E402


def run_seeders() -> None:
    print("=== Запуск сидеров демонстрационных данных Obama Cinema ===")
    settings = get_settings()
    engine = create_engine(settings.sync_database_url)

    seeder_dir = Path("/database/seeders")
    if not seeder_dir.exists():
        seeder_dir = Path(__file__).resolve().parent.parent.parent.parent / "database" / "seeders"
    if not seeder_dir.exists():
        seeder_dir = Path("database/seeders").resolve()

    if not seeder_dir.exists():
        print(f"[!] Директория сидеров не найдена: {seeder_dir}")
        return

    sql_files = sorted(seeder_dir.glob("*.sql"))
    if not sql_files:
        print("[!] В директории сидеров нет файлов .sql")
        return

    with engine.begin() as conn:
        for file_path in sql_files:
            filename = file_path.name
            print(f"  [>] Выполнение сидера: {filename}... ", end="", flush=True)
            sql_content = file_path.read_text(encoding="utf-8")
            try:
                # Execute seeder statements
                conn.execute(text(sql_content))
                print("Успешно!")
            except Exception as e:
                print(f"ОШИБКА: {e}")
                raise

    print("=== Сидеры успешно завершены ===")


if __name__ == "__main__":
    run_seeders()
