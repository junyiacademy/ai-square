#!/usr/bin/env python3
"""
Translate all placeholder locale JSON files efficiently.
This script identifies placeholder texts and translates them to actual translations.
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, Any, List, Tuple

# Translation mappings for common UI elements
TRANSLATIONS = {
    "common": {
        "de": {
            "skip": "Überspringen",
            "next": "Weiter",
            "back": "Zurück",
            "continue": "Fortfahren",
            "loading": "Wird geladen...",
            "save": "Speichern",
            "cancel": "Abbrechen",
            "submit": "Absenden",
            "delete": "Löschen",
            "edit": "Bearbeiten",
            "close": "Schließen",
            "error": "Fehler",
            "success": "Erfolg",
            "warning": "Warnung",
            "info": "Info",
            "backToDashboard": "Zurück zum Dashboard",
            "minutes": "Minuten",
            "hours": "Stunden",
            "days": "Tage",
            "view": "Ansehen",
            "difficulty": {
                "beginner": "Anfänger",
                "intermediate": "Fortgeschritten",
                "advanced": "Experte"
            }
        },
        "es": {
            "skip": "Omitir",
            "next": "Siguiente",
            "back": "Atrás",
            "continue": "Continuar",
            "loading": "Cargando...",
            "save": "Guardar",
            "cancel": "Cancelar",
            "submit": "Enviar",
            "delete": "Eliminar",
            "edit": "Editar",
            "close": "Cerrar",
            "error": "Error",
            "success": "Éxito",
            "warning": "Advertencia",
            "info": "Información",
            "backToDashboard": "Volver al Panel",
            "minutes": "minutos",
            "hours": "horas",
            "days": "días",
            "view": "Ver",
            "difficulty": {
                "beginner": "Principiante",
                "intermediate": "Intermedio",
                "advanced": "Avanzado"
            }
        },
        "fr": {
            "skip": "Passer",
            "next": "Suivant",
            "back": "Retour",
            "continue": "Continuer",
            "loading": "Chargement...",
            "save": "Enregistrer",
            "cancel": "Annuler",
            "submit": "Soumettre",
            "delete": "Supprimer",
            "edit": "Modifier",
            "close": "Fermer",
            "error": "Erreur",
            "success": "Succès",
            "warning": "Avertissement",
            "info": "Information",
            "backToDashboard": "Retour au tableau de bord",
            "minutes": "minutes",
            "hours": "heures",
            "days": "jours",
            "view": "Voir",
            "difficulty": {
                "beginner": "Débutant",
                "intermediate": "Intermédiaire",
                "advanced": "Avancé"
            }
        },
        "it": {
            "skip": "Salta",
            "next": "Avanti",
            "back": "Indietro",
            "continue": "Continua",
            "loading": "Caricamento...",
            "save": "Salva",
            "cancel": "Annulla",
            "submit": "Invia",
            "delete": "Elimina",
            "edit": "Modifica",
            "close": "Chiudi",
            "error": "Errore",
            "success": "Successo",
            "warning": "Avviso",
            "info": "Informazione",
            "backToDashboard": "Torna alla Dashboard",
            "minutes": "minuti",
            "hours": "ore",
            "days": "giorni",
            "view": "Visualizza",
            "difficulty": {
                "beginner": "Principiante",
                "intermediate": "Intermedio",
                "advanced": "Avanzato"
            }
        },
        "ja": {
            "skip": "スキップ",
            "next": "次へ",
            "back": "戻る",
            "continue": "続ける",
            "loading": "読み込み中...",
            "save": "保存",
            "cancel": "キャンセル",
            "submit": "送信",
            "delete": "削除",
            "edit": "編集",
            "close": "閉じる",
            "error": "エラー",
            "success": "成功",
            "warning": "警告",
            "info": "情報",
            "backToDashboard": "ダッシュボードに戻る",
            "minutes": "分",
            "hours": "時間",
            "days": "日",
            "view": "表示",
            "difficulty": {
                "beginner": "初級",
                "intermediate": "中級",
                "advanced": "上級"
            }
        },
        "ko": {
            "skip": "건너뛰기",
            "next": "다음",
            "back": "뒤로",
            "continue": "계속",
            "loading": "로딩 중...",
            "save": "저장",
            "cancel": "취소",
            "submit": "제출",
            "delete": "삭제",
            "edit": "편집",
            "close": "닫기",
            "error": "오류",
            "success": "성공",
            "warning": "경고",
            "info": "정보",
            "backToDashboard": "대시보드로 돌아가기",
            "minutes": "분",
            "hours": "시간",
            "days": "일",
            "view": "보기",
            "difficulty": {
                "beginner": "초급",
                "intermediate": "중급",
                "advanced": "고급"
            }
        },
        "pt": {
            "skip": "Pular",
            "next": "Próximo",
            "back": "Voltar",
            "continue": "Continuar",
            "loading": "Carregando...",
            "save": "Salvar",
            "cancel": "Cancelar",
            "submit": "Enviar",
            "delete": "Excluir",
            "edit": "Editar",
            "close": "Fechar",
            "error": "Erro",
            "success": "Sucesso",
            "warning": "Aviso",
            "info": "Informação",
            "backToDashboard": "Voltar ao Painel",
            "minutes": "minutos",
            "hours": "horas",
            "days": "dias",
            "view": "Visualizar",
            "difficulty": {
                "beginner": "Iniciante",
                "intermediate": "Intermediário",
                "advanced": "Avançado"
            }
        },
        "ru": {
            "skip": "Пропустить",
            "next": "Далее",
            "back": "Назад",
            "continue": "Продолжить",
            "loading": "Загрузка...",
            "save": "Сохранить",
            "cancel": "Отмена",
            "submit": "Отправить",
            "delete": "Удалить",
            "edit": "Редактировать",
            "close": "Закрыть",
            "error": "Ошибка",
            "success": "Успех",
            "warning": "Предупреждение",
            "info": "Информация",
            "backToDashboard": "Вернуться к панели управления",
            "minutes": "минут",
            "hours": "часов",
            "days": "дней",
            "view": "Просмотр",
            "difficulty": {
                "beginner": "Начинающий",
                "intermediate": "Средний",
                "advanced": "Продвинутый"
            }
        },
        "zhCN": {
            "skip": "跳过",
            "next": "下一步",
            "back": "返回",
            "continue": "继续",
            "loading": "加载中...",
            "save": "保存",
            "cancel": "取消",
            "submit": "提交",
            "delete": "删除",
            "edit": "编辑",
            "close": "关闭",
            "error": "错误",
            "success": "成功",
            "warning": "警告",
            "info": "信息",
            "backToDashboard": "返回仪表板",
            "minutes": "分钟",
            "hours": "小时",
            "days": "天",
            "view": "查看",
            "difficulty": {
                "beginner": "初级",
                "intermediate": "中级",
                "advanced": "高级"
            }
        },
        "zhTW": {
            "skip": "跳過",
            "next": "下一步",
            "back": "返回",
            "continue": "繼續",
            "loading": "載入中...",
            "save": "儲存",
            "cancel": "取消",
            "submit": "提交",
            "delete": "刪除",
            "edit": "編輯",
            "close": "關閉",
            "error": "錯誤",
            "success": "成功",
            "warning": "警告",
            "info": "資訊",
            "backToDashboard": "返回儀表板",
            "minutes": "分鐘",
            "hours": "小時",
            "days": "天",
            "view": "檢視",
            "difficulty": {
                "beginner": "初級",
                "intermediate": "中級",
                "advanced": "高級"
            }
        }
    }
}

# Language names mapping
LANGUAGE_NAMES = {
    "ar": "Arabic",
    "de": "German",
    "es": "Spanish",
    "fr": "French",
    "id": "Indonesian",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "pt": "Portuguese",
    "ru": "Russian",
    "th": "Thai",
    "zhCN": "Chinese (Simplified)",
    "zhTW": "Chinese (Traditional)"
}

def is_placeholder(value: str, lang: str) -> bool:
    """Check if a value is a placeholder that needs translation."""
    if not isinstance(value, str):
        return False
    
    lang_name = LANGUAGE_NAMES.get(lang, lang)
    
    # Check for various placeholder patterns
    patterns = [
        f"\\[{lang_name}\\]",
        f"\\[{lang.upper()}\\]",
        f"\\[{lang}\\]",
        f"{lang_name} translation needed",
        f"text {lang_name}",
        f"text \\[{lang_name}\\]"
    ]
    
    for pattern in patterns:
        if re.search(pattern, value, re.IGNORECASE):
            return True
    
    return False

def extract_key_from_placeholder(placeholder: str) -> str:
    """Extract the English key from a placeholder text."""
    # Remove language tags and clean up
    cleaned = re.sub(r'\[.*?\]', '', placeholder).strip()
    cleaned = re.sub(r'translation needed', '', cleaned, re.IGNORECASE).strip()
    cleaned = re.sub(r'text', '', cleaned, re.IGNORECASE).strip()
    return cleaned

def translate_value(key: str, value: Any, lang: str, file_type: str) -> Any:
    """Translate a value based on its key and language."""
    if isinstance(value, dict):
        # Recursively translate nested objects
        return {k: translate_value(f"{key}.{k}", v, lang, file_type) for k, v in value.items()}
    elif isinstance(value, list):
        # Translate list items
        return [translate_value(f"{key}[{i}]", item, lang, file_type) for i, item in enumerate(value)]
    elif isinstance(value, str) and is_placeholder(value, lang):
        # Check if we have a translation in our mappings
        if file_type in TRANSLATIONS and lang in TRANSLATIONS[file_type]:
            # Navigate through nested keys
            keys = key.split('.')
            translation = TRANSLATIONS[file_type][lang]
            try:
                for k in keys:
                    if k.startswith('[') and k.endswith(']'):
                        # Handle array indices
                        continue
                    translation = translation[k]
                return translation
            except (KeyError, TypeError):
                # If key not found, return placeholder for manual translation
                return value
    
    return value

def process_file(file_path: Path, lang: str) -> Tuple[bool, int]:
    """Process a single JSON file and translate placeholders."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        file_type = file_path.stem
        original_json = json.dumps(data, sort_keys=True)
        
        # Count placeholders
        placeholder_count = count_placeholders(data, lang)
        
        # Translate the data
        translated_data = {}
        for key, value in data.items():
            translated_data[key] = translate_value(key, value, lang, file_type)
        
        # Check if anything changed
        new_json = json.dumps(translated_data, sort_keys=True)
        if original_json != new_json:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(translated_data, f, ensure_ascii=False, indent=2)
            return True, placeholder_count
        
        return False, placeholder_count
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False, 0

def count_placeholders(data: Any, lang: str) -> int:
    """Count the number of placeholders in the data."""
    count = 0
    if isinstance(data, dict):
        for value in data.values():
            count += count_placeholders(value, lang)
    elif isinstance(data, list):
        for item in data:
            count += count_placeholders(item, lang)
    elif isinstance(data, str) and is_placeholder(data, lang):
        count += 1
    return count

def main():
    """Main function to process all locale files."""
    base_dir = Path("/Users/young/project/ai-square/frontend/public/locales")
    
    # Languages to process
    languages = ["de", "es", "fr", "it", "ja", "ko", "pt", "ru", "zhCN", "zhTW"]
    
    # Priority files
    priority_files = ["common.json", "dashboard.json", "chat.json", "learning.json"]
    
    total_files_processed = 0
    total_placeholders = 0
    
    print("Starting translation of locale files...")
    print("=" * 60)
    
    for lang in languages:
        lang_dir = base_dir / lang
        if not lang_dir.exists():
            print(f"Skipping {lang}: directory not found")
            continue
        
        print(f"\nProcessing {LANGUAGE_NAMES.get(lang, lang)}:")
        print("-" * 40)
        
        # Process priority files first
        for priority_file in priority_files:
            file_path = lang_dir / priority_file
            if file_path.exists():
                changed, placeholders = process_file(file_path, lang)
                if changed:
                    print(f"  ✓ {priority_file}: translated {placeholders} placeholders")
                    total_files_processed += 1
                    total_placeholders += placeholders
                elif placeholders > 0:
                    print(f"  ⚠ {priority_file}: {placeholders} placeholders need manual translation")
        
        # Process other files
        for file_path in lang_dir.glob("*.json"):
            if file_path.name not in priority_files:
                changed, placeholders = process_file(file_path, lang)
                if changed:
                    print(f"  ✓ {file_path.name}: translated {placeholders} placeholders")
                    total_files_processed += 1
                    total_placeholders += placeholders
    
    print("\n" + "=" * 60)
    print(f"Translation complete!")
    print(f"Files updated: {total_files_processed}")
    print(f"Placeholders translated: {total_placeholders}")
    print("\nNote: Some files may still contain placeholders that need manual translation.")
    print("Please review the files and add translations for domain-specific terms.")

if __name__ == "__main__":
    main()