#!/usr/bin/env python3
"""
Comprehensive translation script for all locale JSON files.
Handles all placeholder translations across all languages.
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, Any, Tuple

# Comprehensive translations for all key files
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
    },
    "dashboard": {
        "de": {
            "welcome": "Willkommen zurück, {{name}}!",
            "subtitle": "Hier ist Ihre KI-Kompetenz-Fortschrittsübersicht",
            "aiLiteracyProgress": "KI-Kompetenz-Fortschritt",
            "domains": {
                "engaging_with_ai": "Mit KI interagieren",
                "creating_with_ai": "Mit KI erstellen",
                "managing_with_ai": "Mit KI verwalten",
                "designing_with_ai": "Mit KI gestalten"
            },
            "viewDetailedProgress": "Detaillierten Lernpfad anzeigen",
            "learningStatistics": "Lernstatistiken",
            "completedScenarios": "Abgeschlossen",
            "inProgress": "In Bearbeitung",
            "learningHours": "Stunden",
            "dayStreak": "Tage-Serie",
            "recentActivities": "Neueste Aktivitäten",
            "noRecentActivities": "Keine aktuellen Aktivitäten. Beginnen Sie zu lernen, um Ihren Fortschritt hier zu sehen!",
            "activities": {
                "completedAssessment": "KI-Kompetenz-Bewertung abgeschlossen",
                "assessmentDesc": "Ihr KI-Wissensniveau entdeckt"
            },
            "recommendedActions": "Empfohlene nächste Schritte",
            "nextActions": {
                "takeAssessment": "KI-Kompetenz-Bewertung durchführen",
                "assessmentDesc": "Entdecken Sie Ihr aktuelles KI-Wissensniveau und erhalten Sie personalisierte Empfehlungen",
                "viewLearningPath": "Ihren Lernpfad ansehen",
                "learningPathDesc": "Sehen Sie personalisierte Empfehlungen basierend auf Ihren Bewertungsergebnissen",
                "startPBL": "Ein PBL-Szenario starten",
                "pblDesc": "Üben Sie praktische KI-Fähigkeiten mit interaktiven Szenarien"
            },
            "priority": {
                "high": "Hoch",
                "medium": "Mittel",
                "low": "Niedrig"
            },
            "quickLinks": "Schnellzugriff",
            "explorePBL": "PBL-Szenarien erkunden",
            "viewCompetencies": "KI-Kompetenzen anzeigen",
            "viewHistory": "Lernverlauf anzeigen",
            "exploreKSA": "Wissenskarte erkunden",
            "yourGoals": "Ihre Lernziele",
            "updateGoals": "Ziele aktualisieren",
            "learningPathQuickAccess": "Personalisierte Lernempfehlungen",
            "learningPathDescription": "Erkunden Sie KI-Lernszenarien, die auf Ihre Bewertungsergebnisse und Interessen zugeschnitten sind. Wählen Sie die Bereiche, die am besten zu Ihren Bedürfnissen passen.",
            "viewAllPaths": "Alle Lernpfade anzeigen",
            "focusOnWeakAreas": "Auf schwache Bereiche konzentrieren",
            "aiAdvisor": "KI-Lernberater"
        },
        "es": {
            "welcome": "¡Bienvenido de nuevo, {{name}}!",
            "subtitle": "Aquí está tu resumen de progreso en alfabetización de IA",
            "aiLiteracyProgress": "Progreso en Alfabetización de IA",
            "domains": {
                "engaging_with_ai": "Interactuando con IA",
                "creating_with_ai": "Creando con IA",
                "managing_with_ai": "Gestionando con IA",
                "designing_with_ai": "Diseñando con IA"
            },
            "viewDetailedProgress": "Ver ruta de aprendizaje detallada",
            "learningStatistics": "Estadísticas de Aprendizaje",
            "completedScenarios": "Completados",
            "inProgress": "En Progreso",
            "learningHours": "Horas",
            "dayStreak": "Racha de Días",
            "recentActivities": "Actividades Recientes",
            "noRecentActivities": "No hay actividades recientes. ¡Comienza a aprender para ver tu progreso aquí!",
            "activities": {
                "completedAssessment": "Evaluación de Alfabetización de IA completada",
                "assessmentDesc": "Descubriste tu nivel base de conocimiento de IA"
            },
            "recommendedActions": "Próximos Pasos Recomendados",
            "nextActions": {
                "takeAssessment": "Realizar Evaluación de Alfabetización de IA",
                "assessmentDesc": "Descubre tu nivel actual de conocimiento de IA y obtén recomendaciones personalizadas",
                "viewLearningPath": "Ver Tu Ruta de Aprendizaje",
                "learningPathDesc": "Ver recomendaciones personalizadas basadas en tus resultados de evaluación",
                "startPBL": "Comenzar un Escenario PBL",
                "pblDesc": "Practica habilidades de IA del mundo real con escenarios interactivos"
            },
            "priority": {
                "high": "Alta",
                "medium": "Media",
                "low": "Baja"
            },
            "quickLinks": "Enlaces Rápidos",
            "explorePBL": "Explorar Escenarios PBL",
            "viewCompetencies": "Ver Competencias de IA",
            "viewHistory": "Ver Historial de Aprendizaje",
            "exploreKSA": "Explorar Mapa de Conocimiento",
            "yourGoals": "Tus Objetivos de Aprendizaje",
            "updateGoals": "Actualizar tus objetivos",
            "learningPathQuickAccess": "Recomendaciones de Aprendizaje Personalizadas",
            "learningPathDescription": "Explora escenarios de aprendizaje de IA adaptados a tus resultados de evaluación e intereses. Elige las áreas que mejor se adapten a tus necesidades.",
            "viewAllPaths": "Ver Todas las Rutas de Aprendizaje",
            "focusOnWeakAreas": "Enfocarse en Áreas Débiles",
            "aiAdvisor": "Asesor de Aprendizaje IA"
        },
        "fr": {
            "welcome": "Bienvenue, {{name}} !",
            "subtitle": "Voici votre aperçu de progression en littératie IA",
            "aiLiteracyProgress": "Progression en Littératie IA",
            "domains": {
                "engaging_with_ai": "Interagir avec l'IA",
                "creating_with_ai": "Créer avec l'IA",
                "managing_with_ai": "Gérer avec l'IA",
                "designing_with_ai": "Concevoir avec l'IA"
            },
            "viewDetailedProgress": "Voir le parcours d'apprentissage détaillé",
            "learningStatistics": "Statistiques d'Apprentissage",
            "completedScenarios": "Complétés",
            "inProgress": "En Cours",
            "learningHours": "Heures",
            "dayStreak": "Série de Jours",
            "recentActivities": "Activités Récentes",
            "noRecentActivities": "Aucune activité récente. Commencez à apprendre pour voir votre progression ici !",
            "activities": {
                "completedAssessment": "Évaluation de Littératie IA complétée",
                "assessmentDesc": "Découvert votre niveau de base en IA"
            },
            "recommendedActions": "Prochaines Étapes Recommandées",
            "nextActions": {
                "takeAssessment": "Passer l'Évaluation de Littératie IA",
                "assessmentDesc": "Découvrez votre niveau actuel de connaissances en IA et obtenez des recommandations personnalisées",
                "viewLearningPath": "Voir Votre Parcours d'Apprentissage",
                "learningPathDesc": "Voir les recommandations personnalisées basées sur vos résultats d'évaluation",
                "startPBL": "Commencer un Scénario PBL",
                "pblDesc": "Pratiquez des compétences IA réelles avec des scénarios interactifs"
            },
            "priority": {
                "high": "Élevée",
                "medium": "Moyenne",
                "low": "Faible"
            },
            "quickLinks": "Liens Rapides",
            "explorePBL": "Explorer les Scénarios PBL",
            "viewCompetencies": "Voir les Compétences IA",
            "viewHistory": "Voir l'Historique d'Apprentissage",
            "exploreKSA": "Explorer la Carte de Connaissances",
            "yourGoals": "Vos Objectifs d'Apprentissage",
            "updateGoals": "Mettre à jour vos objectifs",
            "learningPathQuickAccess": "Recommandations d'Apprentissage Personnalisées",
            "learningPathDescription": "Explorez des scénarios d'apprentissage IA adaptés à vos résultats d'évaluation et intérêts. Choisissez les domaines qui correspondent le mieux à vos besoins.",
            "viewAllPaths": "Voir Tous les Parcours d'Apprentissage",
            "focusOnWeakAreas": "Se Concentrer sur les Points Faibles",
            "aiAdvisor": "Conseiller d'Apprentissage IA"
        },
        "it": {
            "welcome": "Bentornato, {{name}}!",
            "subtitle": "Ecco il tuo riepilogo dei progressi nell'alfabetizzazione IA",
            "aiLiteracyProgress": "Progressi nell'Alfabetizzazione IA",
            "domains": {
                "engaging_with_ai": "Interagire con l'IA",
                "creating_with_ai": "Creare con l'IA",
                "managing_with_ai": "Gestire con l'IA",
                "designing_with_ai": "Progettare con l'IA"
            },
            "viewDetailedProgress": "Visualizza percorso di apprendimento dettagliato",
            "learningStatistics": "Statistiche di Apprendimento",
            "completedScenarios": "Completati",
            "inProgress": "In Corso",
            "learningHours": "Ore",
            "dayStreak": "Serie di Giorni",
            "recentActivities": "Attività Recenti",
            "noRecentActivities": "Nessuna attività recente. Inizia ad imparare per vedere i tuoi progressi qui!",
            "activities": {
                "completedAssessment": "Valutazione di Alfabetizzazione IA completata",
                "assessmentDesc": "Scoperto il tuo livello di base di conoscenza IA"
            },
            "recommendedActions": "Prossimi Passi Consigliati",
            "nextActions": {
                "takeAssessment": "Fai la Valutazione di Alfabetizzazione IA",
                "assessmentDesc": "Scopri il tuo livello attuale di conoscenza IA e ottieni raccomandazioni personalizzate",
                "viewLearningPath": "Visualizza il Tuo Percorso di Apprendimento",
                "learningPathDesc": "Vedi raccomandazioni personalizzate basate sui tuoi risultati di valutazione",
                "startPBL": "Inizia uno Scenario PBL",
                "pblDesc": "Pratica competenze IA del mondo reale con scenari interattivi"
            },
            "priority": {
                "high": "Alta",
                "medium": "Media",
                "low": "Bassa"
            },
            "quickLinks": "Collegamenti Rapidi",
            "explorePBL": "Esplora Scenari PBL",
            "viewCompetencies": "Visualizza Competenze IA",
            "viewHistory": "Visualizza Cronologia Apprendimento",
            "exploreKSA": "Esplora Mappa delle Conoscenze",
            "yourGoals": "I Tuoi Obiettivi di Apprendimento",
            "updateGoals": "Aggiorna i tuoi obiettivi",
            "learningPathQuickAccess": "Raccomandazioni di Apprendimento Personalizzate",
            "learningPathDescription": "Esplora scenari di apprendimento IA adattati ai tuoi risultati di valutazione e interessi. Scegli le aree che meglio si adattano alle tue esigenze.",
            "viewAllPaths": "Visualizza Tutti i Percorsi di Apprendimento",
            "focusOnWeakAreas": "Concentrati sulle Aree Deboli",
            "aiAdvisor": "Consulente di Apprendimento IA"
        },
        "ja": {
            "welcome": "おかえりなさい、{{name}}さん！",
            "subtitle": "AIリテラシーの進捗状況の概要です",
            "aiLiteracyProgress": "AIリテラシーの進捗",
            "domains": {
                "engaging_with_ai": "AIとの関わり",
                "creating_with_ai": "AIでの創造",
                "managing_with_ai": "AIでの管理",
                "designing_with_ai": "AIでの設計"
            },
            "viewDetailedProgress": "詳細な学習パスを表示",
            "learningStatistics": "学習統計",
            "completedScenarios": "完了",
            "inProgress": "進行中",
            "learningHours": "時間",
            "dayStreak": "日間連続",
            "recentActivities": "最近のアクティビティ",
            "noRecentActivities": "最近のアクティビティはありません。学習を始めて、ここで進捗を確認しましょう！",
            "activities": {
                "completedAssessment": "AIリテラシー評価を完了",
                "assessmentDesc": "AIの知識レベルを発見しました"
            },
            "recommendedActions": "推奨される次のステップ",
            "nextActions": {
                "takeAssessment": "AIリテラシー評価を受ける",
                "assessmentDesc": "現在のAI知識レベルを発見し、パーソナライズされた推奨事項を取得します",
                "viewLearningPath": "学習パスを表示",
                "learningPathDesc": "評価結果に基づいたパーソナライズされた推奨事項を表示",
                "startPBL": "PBLシナリオを開始",
                "pblDesc": "インタラクティブなシナリオで実世界のAIスキルを練習"
            },
            "priority": {
                "high": "高",
                "medium": "中",
                "low": "低"
            },
            "quickLinks": "クイックリンク",
            "explorePBL": "PBLシナリオを探索",
            "viewCompetencies": "AIコンピテンシーを表示",
            "viewHistory": "学習履歴を表示",
            "exploreKSA": "知識マップを探索",
            "yourGoals": "あなたの学習目標",
            "updateGoals": "目標を更新",
            "learningPathQuickAccess": "パーソナライズされた学習推奨事項",
            "learningPathDescription": "評価結果と興味に合わせたAI学習シナリオを探索します。あなたのニーズに最も適した分野を選択してください。",
            "viewAllPaths": "すべての学習パスを表示",
            "focusOnWeakAreas": "弱点に焦点を当てる",
            "aiAdvisor": "AI学習アドバイザー"
        },
        "ko": {
            "welcome": "다시 오신 것을 환영합니다, {{name}}님!",
            "subtitle": "AI 리터러시 진행 상황 개요입니다",
            "aiLiteracyProgress": "AI 리터러시 진행 상황",
            "domains": {
                "engaging_with_ai": "AI와 상호작용",
                "creating_with_ai": "AI로 창작",
                "managing_with_ai": "AI로 관리",
                "designing_with_ai": "AI로 설계"
            },
            "viewDetailedProgress": "상세 학습 경로 보기",
            "learningStatistics": "학습 통계",
            "completedScenarios": "완료됨",
            "inProgress": "진행 중",
            "learningHours": "시간",
            "dayStreak": "일 연속",
            "recentActivities": "최근 활동",
            "noRecentActivities": "최근 활동이 없습니다. 학습을 시작하여 진행 상황을 확인하세요!",
            "activities": {
                "completedAssessment": "AI 리터러시 평가 완료",
                "assessmentDesc": "AI 지식 수준을 발견했습니다"
            },
            "recommendedActions": "추천 다음 단계",
            "nextActions": {
                "takeAssessment": "AI 리터러시 평가 받기",
                "assessmentDesc": "현재 AI 지식 수준을 파악하고 맞춤형 추천을 받으세요",
                "viewLearningPath": "학습 경로 보기",
                "learningPathDesc": "평가 결과를 바탕으로 한 맞춤형 추천 보기",
                "startPBL": "PBL 시나리오 시작",
                "pblDesc": "대화형 시나리오로 실제 AI 기술 연습"
            },
            "priority": {
                "high": "높음",
                "medium": "중간",
                "low": "낮음"
            },
            "quickLinks": "빠른 링크",
            "explorePBL": "PBL 시나리오 탐색",
            "viewCompetencies": "AI 역량 보기",
            "viewHistory": "학습 기록 보기",
            "exploreKSA": "지식 맵 탐색",
            "yourGoals": "학습 목표",
            "updateGoals": "목표 업데이트",
            "learningPathQuickAccess": "맞춤형 학습 추천",
            "learningPathDescription": "평가 결과와 관심사에 맞춘 AI 학습 시나리오를 탐색하세요. 필요에 가장 적합한 영역을 선택하세요.",
            "viewAllPaths": "모든 학습 경로 보기",
            "focusOnWeakAreas": "약점에 집중",
            "aiAdvisor": "AI 학습 어드바이저"
        },
        "pt": {
            "welcome": "Bem-vindo de volta, {{name}}!",
            "subtitle": "Aqui está sua visão geral do progresso em alfabetização de IA",
            "aiLiteracyProgress": "Progresso em Alfabetização de IA",
            "domains": {
                "engaging_with_ai": "Interagindo com IA",
                "creating_with_ai": "Criando com IA",
                "managing_with_ai": "Gerenciando com IA",
                "designing_with_ai": "Projetando com IA"
            },
            "viewDetailedProgress": "Ver caminho de aprendizagem detalhado",
            "learningStatistics": "Estatísticas de Aprendizagem",
            "completedScenarios": "Concluídos",
            "inProgress": "Em Progresso",
            "learningHours": "Horas",
            "dayStreak": "Sequência de Dias",
            "recentActivities": "Atividades Recentes",
            "noRecentActivities": "Sem atividades recentes. Comece a aprender para ver seu progresso aqui!",
            "activities": {
                "completedAssessment": "Avaliação de Alfabetização de IA concluída",
                "assessmentDesc": "Descobriu seu nível base de conhecimento de IA"
            },
            "recommendedActions": "Próximos Passos Recomendados",
            "nextActions": {
                "takeAssessment": "Fazer Avaliação de Alfabetização de IA",
                "assessmentDesc": "Descubra seu nível atual de conhecimento de IA e obtenha recomendações personalizadas",
                "viewLearningPath": "Ver Seu Caminho de Aprendizagem",
                "learningPathDesc": "Veja recomendações personalizadas baseadas em seus resultados de avaliação",
                "startPBL": "Iniciar um Cenário PBL",
                "pblDesc": "Pratique habilidades de IA do mundo real com cenários interativos"
            },
            "priority": {
                "high": "Alta",
                "medium": "Média",
                "low": "Baixa"
            },
            "quickLinks": "Links Rápidos",
            "explorePBL": "Explorar Cenários PBL",
            "viewCompetencies": "Ver Competências de IA",
            "viewHistory": "Ver Histórico de Aprendizagem",
            "exploreKSA": "Explorar Mapa de Conhecimento",
            "yourGoals": "Seus Objetivos de Aprendizagem",
            "updateGoals": "Atualizar seus objetivos",
            "learningPathQuickAccess": "Recomendações de Aprendizagem Personalizadas",
            "learningPathDescription": "Explore cenários de aprendizagem de IA adaptados aos seus resultados de avaliação e interesses. Escolha as áreas que melhor atendem às suas necessidades.",
            "viewAllPaths": "Ver Todos os Caminhos de Aprendizagem",
            "focusOnWeakAreas": "Focar em Áreas Fracas",
            "aiAdvisor": "Consultor de Aprendizagem IA"
        },
        "ru": {
            "welcome": "С возвращением, {{name}}!",
            "subtitle": "Вот обзор вашего прогресса в ИИ-грамотности",
            "aiLiteracyProgress": "Прогресс в ИИ-грамотности",
            "domains": {
                "engaging_with_ai": "Взаимодействие с ИИ",
                "creating_with_ai": "Создание с ИИ",
                "managing_with_ai": "Управление с ИИ",
                "designing_with_ai": "Проектирование с ИИ"
            },
            "viewDetailedProgress": "Посмотреть подробный путь обучения",
            "learningStatistics": "Статистика обучения",
            "completedScenarios": "Завершено",
            "inProgress": "В процессе",
            "learningHours": "Часов",
            "dayStreak": "Дней подряд",
            "recentActivities": "Недавние активности",
            "noRecentActivities": "Нет недавних активностей. Начните учиться, чтобы увидеть свой прогресс здесь!",
            "activities": {
                "completedAssessment": "Оценка ИИ-грамотности завершена",
                "assessmentDesc": "Обнаружен ваш базовый уровень знаний об ИИ"
            },
            "recommendedActions": "Рекомендуемые следующие шаги",
            "nextActions": {
                "takeAssessment": "Пройти оценку ИИ-грамотности",
                "assessmentDesc": "Откройте свой текущий уровень знаний об ИИ и получите персонализированные рекомендации",
                "viewLearningPath": "Посмотреть ваш путь обучения",
                "learningPathDesc": "Посмотрите персонализированные рекомендации на основе результатов вашей оценки",
                "startPBL": "Начать PBL-сценарий",
                "pblDesc": "Практикуйте реальные навыки ИИ с интерактивными сценариями"
            },
            "priority": {
                "high": "Высокий",
                "medium": "Средний",
                "low": "Низкий"
            },
            "quickLinks": "Быстрые ссылки",
            "explorePBL": "Исследовать PBL-сценарии",
            "viewCompetencies": "Посмотреть компетенции ИИ",
            "viewHistory": "Посмотреть историю обучения",
            "exploreKSA": "Исследовать карту знаний",
            "yourGoals": "Ваши цели обучения",
            "updateGoals": "Обновить ваши цели",
            "learningPathQuickAccess": "Персонализированные рекомендации по обучению",
            "learningPathDescription": "Исследуйте сценарии обучения ИИ, адаптированные к результатам вашей оценки и интересам. Выберите области, которые лучше всего соответствуют вашим потребностям.",
            "viewAllPaths": "Посмотреть все пути обучения",
            "focusOnWeakAreas": "Сосредоточиться на слабых областях",
            "aiAdvisor": "Советник по обучению ИИ"
        },
        "zhCN": {
            "welcome": "欢迎回来，{{name}}！",
            "subtitle": "这是您的AI素养进度概览",
            "aiLiteracyProgress": "AI素养进度",
            "domains": {
                "engaging_with_ai": "与AI互动",
                "creating_with_ai": "与AI创作",
                "managing_with_ai": "与AI管理",
                "designing_with_ai": "与AI设计"
            },
            "viewDetailedProgress": "查看详细学习路径",
            "learningStatistics": "学习统计",
            "completedScenarios": "已完成",
            "inProgress": "进行中",
            "learningHours": "小时",
            "dayStreak": "天连续",
            "recentActivities": "最近活动",
            "noRecentActivities": "没有最近的活动。开始学习以在此查看您的进度！",
            "activities": {
                "completedAssessment": "完成AI素养评估",
                "assessmentDesc": "发现了您的AI知识基线"
            },
            "recommendedActions": "推荐的下一步",
            "nextActions": {
                "takeAssessment": "进行AI素养评估",
                "assessmentDesc": "发现您当前的AI知识水平并获得个性化推荐",
                "viewLearningPath": "查看您的学习路径",
                "learningPathDesc": "查看基于您评估结果的个性化推荐",
                "startPBL": "开始PBL场景",
                "pblDesc": "通过互动场景练习真实世界的AI技能"
            },
            "priority": {
                "high": "高",
                "medium": "中",
                "low": "低"
            },
            "quickLinks": "快速链接",
            "explorePBL": "探索PBL场景",
            "viewCompetencies": "查看AI能力",
            "viewHistory": "查看学习历史",
            "exploreKSA": "探索知识地图",
            "yourGoals": "您的学习目标",
            "updateGoals": "更新您的目标",
            "learningPathQuickAccess": "个性化学习推荐",
            "learningPathDescription": "探索根据您的评估结果和兴趣定制的AI学习场景。选择最适合您需求的领域。",
            "viewAllPaths": "查看所有学习路径",
            "focusOnWeakAreas": "专注于薄弱领域",
            "aiAdvisor": "AI学习顾问"
        },
        "zhTW": {
            "welcome": "歡迎回來，{{name}}！",
            "subtitle": "這是您的AI素養進度概覽",
            "aiLiteracyProgress": "AI素養進度",
            "domains": {
                "engaging_with_ai": "與AI互動",
                "creating_with_ai": "與AI創作",
                "managing_with_ai": "與AI管理",
                "designing_with_ai": "與AI設計"
            },
            "viewDetailedProgress": "查看詳細學習路徑",
            "learningStatistics": "學習統計",
            "completedScenarios": "已完成",
            "inProgress": "進行中",
            "learningHours": "小時",
            "dayStreak": "天連續",
            "recentActivities": "最近活動",
            "noRecentActivities": "沒有最近的活動。開始學習以在此查看您的進度！",
            "activities": {
                "completedAssessment": "完成AI素養評估",
                "assessmentDesc": "發現了您的AI知識基線"
            },
            "recommendedActions": "推薦的下一步",
            "nextActions": {
                "takeAssessment": "進行AI素養評估",
                "assessmentDesc": "發現您當前的AI知識水平並獲得個人化推薦",
                "viewLearningPath": "查看您的學習路徑",
                "learningPathDesc": "查看基於您評估結果的個人化推薦",
                "startPBL": "開始PBL場景",
                "pblDesc": "通過互動場景練習真實世界的AI技能"
            },
            "priority": {
                "high": "高",
                "medium": "中",
                "low": "低"
            },
            "quickLinks": "快速連結",
            "explorePBL": "探索PBL場景",
            "viewCompetencies": "查看AI能力",
            "viewHistory": "查看學習歷史",
            "exploreKSA": "探索知識地圖",
            "yourGoals": "您的學習目標",
            "updateGoals": "更新您的目標",
            "learningPathQuickAccess": "個人化學習推薦",
            "learningPathDescription": "探索根據您的評估結果和興趣定制的AI學習場景。選擇最適合您需求的領域。",
            "viewAllPaths": "查看所有學習路徑",
            "focusOnWeakAreas": "專注於薄弱領域",
            "aiAdvisor": "AI學習顧問"
        }
    },
    "chat": {
        "de": {
            "aiAdvisor": "KI-Lernberater",
            "newChat": "Neuer Chat",
            "history": "Chat-Verlauf",
            "welcomeTitle": "Hallo! Ich bin Ihr KI-Lernberater",
            "welcomeMessage": "Ich bin hier, um Ihnen bei Ihrer KI-Kompetenzreise zu helfen. Fragen Sie mich nach Lernpfaden, PBL-Szenarien oder KI-Konzepten, die Sie besser verstehen möchten.",
            "inputPlaceholder": "Geben Sie hier Ihre Nachricht ein... (Enter zum Senden)",
            "suggestedTopic1": "Mit welchem PBL-Szenario soll ich beginnen?",
            "suggestedTopic2": "Helfen Sie mir, meine Bewertungsergebnisse zu verstehen",
            "suggestedTopic3": "Was sind meine Schwachpunkte und wie kann ich mich verbessern?",
            "suggestedTopic4": "Erklären Sie KI-Konzepte in einfachen Worten"
        },
        "es": {
            "aiAdvisor": "Asesor de Aprendizaje IA",
            "newChat": "Nuevo Chat",
            "history": "Historial de Chat",
            "welcomeTitle": "¡Hola! Soy tu Asesor de Aprendizaje IA",
            "welcomeMessage": "Estoy aquí para ayudarte en tu viaje de alfabetización de IA. Pregúntame sobre rutas de aprendizaje, escenarios PBL o cualquier concepto de IA que quieras entender mejor.",
            "inputPlaceholder": "Escribe tu mensaje aquí... (Presiona Enter para enviar)",
            "suggestedTopic1": "¿Con qué escenario PBL debería comenzar?",
            "suggestedTopic2": "Ayúdame a entender mis resultados de evaluación",
            "suggestedTopic3": "¿Cuáles son mis áreas débiles y cómo puedo mejorar?",
            "suggestedTopic4": "Explica conceptos de IA en términos simples"
        },
        "fr": {
            "aiAdvisor": "Conseiller d'Apprentissage IA",
            "newChat": "Nouveau Chat",
            "history": "Historique du Chat",
            "welcomeTitle": "Bonjour ! Je suis votre Conseiller d'Apprentissage IA",
            "welcomeMessage": "Je suis ici pour vous aider dans votre parcours de littératie IA. Posez-moi des questions sur les parcours d'apprentissage, les scénarios PBL ou tout concept IA que vous souhaitez mieux comprendre.",
            "inputPlaceholder": "Tapez votre message ici... (Appuyez sur Entrée pour envoyer)",
            "suggestedTopic1": "Par quel scénario PBL devrais-je commencer ?",
            "suggestedTopic2": "Aidez-moi à comprendre mes résultats d'évaluation",
            "suggestedTopic3": "Quels sont mes points faibles et comment puis-je m'améliorer ?",
            "suggestedTopic4": "Expliquez les concepts IA en termes simples"
        },
        "it": {
            "aiAdvisor": "Consulente di Apprendimento IA",
            "newChat": "Nuova Chat",
            "history": "Cronologia Chat",
            "welcomeTitle": "Ciao! Sono il tuo Consulente di Apprendimento IA",
            "welcomeMessage": "Sono qui per aiutarti nel tuo percorso di alfabetizzazione IA. Chiedimi dei percorsi di apprendimento, scenari PBL o qualsiasi concetto IA che vorresti capire meglio.",
            "inputPlaceholder": "Digita il tuo messaggio qui... (Premi Invio per inviare)",
            "suggestedTopic1": "Con quale scenario PBL dovrei iniziare?",
            "suggestedTopic2": "Aiutami a capire i miei risultati di valutazione",
            "suggestedTopic3": "Quali sono le mie aree deboli e come posso migliorare?",
            "suggestedTopic4": "Spiega i concetti IA in termini semplici"
        },
        "ja": {
            "aiAdvisor": "AI学習アドバイザー",
            "newChat": "新しいチャット",
            "history": "チャット履歴",
            "welcomeTitle": "こんにちは！私はあなたのAI学習アドバイザーです",
            "welcomeMessage": "AIリテラシーの旅をサポートするためにここにいます。学習パス、PBLシナリオ、理解を深めたいAIの概念について質問してください。",
            "inputPlaceholder": "メッセージを入力してください...（Enterで送信）",
            "suggestedTopic1": "どのPBLシナリオから始めるべきですか？",
            "suggestedTopic2": "評価結果を理解するのを手伝ってください",
            "suggestedTopic3": "私の弱点は何で、どう改善できますか？",
            "suggestedTopic4": "AI概念を簡単な言葉で説明してください"
        },
        "ko": {
            "aiAdvisor": "AI 학습 어드바이저",
            "newChat": "새 채팅",
            "history": "채팅 기록",
            "welcomeTitle": "안녕하세요! 저는 당신의 AI 학습 어드바이저입니다",
            "welcomeMessage": "AI 리터러시 여정을 도와드리기 위해 여기 있습니다. 학습 경로, PBL 시나리오 또는 더 잘 이해하고 싶은 AI 개념에 대해 물어보세요.",
            "inputPlaceholder": "여기에 메시지를 입력하세요... (Enter로 전송)",
            "suggestedTopic1": "어떤 PBL 시나리오로 시작해야 할까요?",
            "suggestedTopic2": "평가 결과를 이해하도록 도와주세요",
            "suggestedTopic3": "제 약점은 무엇이고 어떻게 개선할 수 있나요?",
            "suggestedTopic4": "AI 개념을 간단한 용어로 설명해주세요"
        },
        "pt": {
            "aiAdvisor": "Consultor de Aprendizagem IA",
            "newChat": "Novo Chat",
            "history": "Histórico de Chat",
            "welcomeTitle": "Olá! Sou seu Consultor de Aprendizagem IA",
            "welcomeMessage": "Estou aqui para ajudá-lo em sua jornada de alfabetização de IA. Pergunte-me sobre caminhos de aprendizagem, cenários PBL ou qualquer conceito de IA que você gostaria de entender melhor.",
            "inputPlaceholder": "Digite sua mensagem aqui... (Pressione Enter para enviar)",
            "suggestedTopic1": "Com qual cenário PBL devo começar?",
            "suggestedTopic2": "Ajude-me a entender meus resultados de avaliação",
            "suggestedTopic3": "Quais são minhas áreas fracas e como posso melhorar?",
            "suggestedTopic4": "Explique conceitos de IA em termos simples"
        },
        "ru": {
            "aiAdvisor": "Советник по обучению ИИ",
            "newChat": "Новый чат",
            "history": "История чата",
            "welcomeTitle": "Привет! Я ваш советник по обучению ИИ",
            "welcomeMessage": "Я здесь, чтобы помочь вам в вашем путешествии по ИИ-грамотности. Спросите меня о путях обучения, PBL-сценариях или любых концепциях ИИ, которые вы хотели бы лучше понять.",
            "inputPlaceholder": "Введите ваше сообщение здесь... (Нажмите Enter для отправки)",
            "suggestedTopic1": "С какого PBL-сценария мне следует начать?",
            "suggestedTopic2": "Помогите мне понять результаты моей оценки",
            "suggestedTopic3": "Каковы мои слабые стороны и как я могу улучшиться?",
            "suggestedTopic4": "Объясните концепции ИИ простыми словами"
        },
        "zhCN": {
            "aiAdvisor": "AI学习顾问",
            "newChat": "新对话",
            "history": "对话历史",
            "welcomeTitle": "您好！我是您的AI学习顾问",
            "welcomeMessage": "我在这里帮助您进行AI素养之旅。向我询问学习路径、PBL场景或您想更好理解的任何AI概念。",
            "inputPlaceholder": "在此输入您的消息...（按Enter发送）",
            "suggestedTopic1": "我应该从哪个PBL场景开始？",
            "suggestedTopic2": "帮我理解我的评估结果",
            "suggestedTopic3": "我的薄弱领域是什么，如何改进？",
            "suggestedTopic4": "用简单的术语解释AI概念"
        },
        "zhTW": {
            "aiAdvisor": "AI學習顧問",
            "newChat": "新對話",
            "history": "對話歷史",
            "welcomeTitle": "您好！我是您的AI學習顧問",
            "welcomeMessage": "我在這裡幫助您進行AI素養之旅。向我詢問學習路徑、PBL場景或您想更好理解的任何AI概念。",
            "inputPlaceholder": "在此輸入您的訊息...（按Enter發送）",
            "suggestedTopic1": "我應該從哪個PBL場景開始？",
            "suggestedTopic2": "幫我理解我的評估結果",
            "suggestedTopic3": "我的薄弱領域是什麼，如何改進？",
            "suggestedTopic4": "用簡單的術語解釋AI概念"
        }
    },
    "learning": {
        "de": {
            "learningPath": {
                "title": "Ihr personalisierter Lernpfad",
                "subtitle": "Basierend auf Ihren Bewertungsergebnissen ist hier Ihre empfohlene Lernreise",
                "yourProgress": "Ihre Fortschrittsübersicht",
                "currentScore": "Aktuell",
                "target": "Ziel",
                "completed": "abgeschlossen",
                "filteringBy": "Zeige Empfehlungen für: {{domain}}",
                "clearFilter": "Alle Empfehlungen anzeigen",
                "recommendedPath": "Empfohlener Lernpfad",
                "estimatedTime": "Gesamtzeit: {{hours}}h {{minutes}}m",
                "startLearning": "Lernen beginnen",
                "progress": "Fortschritt",
                "weakDomainReason": "Empfohlen zur Stärkung von {{domain}} (aktuell: {{score}}%)",
                "strongDomainReason": "Fortgeschrittene Herausforderung für Ihre starken {{domain}}-Fähigkeiten ({{score}}%)",
                "averageDomainReason": "Weiter {{domain}}-Expertise aufbauen (aktuell: {{score}}%)",
                "goToDashboard": "Zum Dashboard",
                "dashboardHint": "Verfolgen Sie Ihren Gesamtfortschritt und setzen Sie Ihre Lernreise fort"
            }
        },
        "es": {
            "learningPath": {
                "title": "Tu Ruta de Aprendizaje Personalizada",
                "subtitle": "Basado en tus resultados de evaluación, aquí está tu viaje de aprendizaje recomendado",
                "yourProgress": "Tu Resumen de Progreso",
                "currentScore": "Actual",
                "target": "Objetivo",
                "completed": "completado",
                "filteringBy": "Mostrando recomendaciones para: {{domain}}",
                "clearFilter": "Mostrar todas las recomendaciones",
                "recommendedPath": "Ruta de Aprendizaje Recomendada",
                "estimatedTime": "Tiempo total: {{hours}}h {{minutes}}m",
                "startLearning": "Comenzar a Aprender",
                "progress": "Progreso",
                "weakDomainReason": "Recomendado para fortalecer {{domain}} (actual: {{score}}%)",
                "strongDomainReason": "Desafío avanzado para tus fuertes habilidades de {{domain}} ({{score}}%)",
                "averageDomainReason": "Continuar construyendo experiencia en {{domain}} (actual: {{score}}%)",
                "goToDashboard": "Ir al Panel",
                "dashboardHint": "Rastrea tu progreso general y continúa tu viaje de aprendizaje"
            }
        },
        "fr": {
            "learningPath": {
                "title": "Votre Parcours d'Apprentissage Personnalisé",
                "subtitle": "Basé sur vos résultats d'évaluation, voici votre parcours d'apprentissage recommandé",
                "yourProgress": "Votre Aperçu de Progression",
                "currentScore": "Actuel",
                "target": "Objectif",
                "completed": "complété",
                "filteringBy": "Affichage des recommandations pour : {{domain}}",
                "clearFilter": "Afficher toutes les recommandations",
                "recommendedPath": "Parcours d'Apprentissage Recommandé",
                "estimatedTime": "Temps total : {{hours}}h {{minutes}}m",
                "startLearning": "Commencer l'Apprentissage",
                "progress": "Progression",
                "weakDomainReason": "Recommandé pour renforcer {{domain}} (actuel : {{score}}%)",
                "strongDomainReason": "Défi avancé pour vos fortes compétences en {{domain}} ({{score}}%)",
                "averageDomainReason": "Continuer à développer l'expertise en {{domain}} (actuel : {{score}}%)",
                "goToDashboard": "Aller au Tableau de Bord",
                "dashboardHint": "Suivez votre progression globale et continuez votre parcours d'apprentissage"
            }
        },
        "it": {
            "learningPath": {
                "title": "Il Tuo Percorso di Apprendimento Personalizzato",
                "subtitle": "Basato sui tuoi risultati di valutazione, ecco il tuo percorso di apprendimento consigliato",
                "yourProgress": "Il Tuo Riepilogo dei Progressi",
                "currentScore": "Attuale",
                "target": "Obiettivo",
                "completed": "completato",
                "filteringBy": "Mostrando raccomandazioni per: {{domain}}",
                "clearFilter": "Mostra tutte le raccomandazioni",
                "recommendedPath": "Percorso di Apprendimento Consigliato",
                "estimatedTime": "Tempo totale: {{hours}}h {{minutes}}m",
                "startLearning": "Inizia ad Apprendere",
                "progress": "Progresso",
                "weakDomainReason": "Consigliato per rafforzare {{domain}} (attuale: {{score}}%)",
                "strongDomainReason": "Sfida avanzata per le tue forti competenze in {{domain}} ({{score}}%)",
                "averageDomainReason": "Continua a costruire competenze in {{domain}} (attuale: {{score}}%)",
                "goToDashboard": "Vai alla Dashboard",
                "dashboardHint": "Monitora i tuoi progressi complessivi e continua il tuo percorso di apprendimento"
            }
        },
        "ja": {
            "learningPath": {
                "title": "あなたのパーソナライズされた学習パス",
                "subtitle": "評価結果に基づいて、推奨される学習の旅はこちらです",
                "yourProgress": "進捗状況の概要",
                "currentScore": "現在",
                "target": "目標",
                "completed": "完了",
                "filteringBy": "{{domain}}の推奨事項を表示中",
                "clearFilter": "すべての推奨事項を表示",
                "recommendedPath": "推奨学習パス",
                "estimatedTime": "合計時間: {{hours}}時間{{minutes}}分",
                "startLearning": "学習を開始",
                "progress": "進捗",
                "weakDomainReason": "{{domain}}を強化することを推奨（現在: {{score}}%）",
                "strongDomainReason": "あなたの強い{{domain}}スキル（{{score}}%）への高度な挑戦",
                "averageDomainReason": "{{domain}}の専門知識を構築し続ける（現在: {{score}}%）",
                "goToDashboard": "ダッシュボードへ",
                "dashboardHint": "全体的な進捗を追跡し、学習の旅を続けましょう"
            }
        },
        "ko": {
            "learningPath": {
                "title": "개인 맞춤형 학습 경로",
                "subtitle": "평가 결과를 바탕으로 추천하는 학습 여정입니다",
                "yourProgress": "진행 상황 개요",
                "currentScore": "현재",
                "target": "목표",
                "completed": "완료됨",
                "filteringBy": "{{domain}}에 대한 추천 표시 중",
                "clearFilter": "모든 추천 표시",
                "recommendedPath": "추천 학습 경로",
                "estimatedTime": "총 시간: {{hours}}시간 {{minutes}}분",
                "startLearning": "학습 시작",
                "progress": "진행률",
                "weakDomainReason": "{{domain}} 강화 추천 (현재: {{score}}%)",
                "strongDomainReason": "강력한 {{domain}} 기술({{score}}%)을 위한 고급 과제",
                "averageDomainReason": "{{domain}} 전문성 계속 구축 (현재: {{score}}%)",
                "goToDashboard": "대시보드로 이동",
                "dashboardHint": "전체 진행 상황을 추적하고 학습 여정을 계속하세요"
            }
        },
        "pt": {
            "learningPath": {
                "title": "Seu Caminho de Aprendizagem Personalizado",
                "subtitle": "Com base em seus resultados de avaliação, aqui está sua jornada de aprendizagem recomendada",
                "yourProgress": "Visão Geral do Seu Progresso",
                "currentScore": "Atual",
                "target": "Meta",
                "completed": "concluído",
                "filteringBy": "Mostrando recomendações para: {{domain}}",
                "clearFilter": "Mostrar todas as recomendações",
                "recommendedPath": "Caminho de Aprendizagem Recomendado",
                "estimatedTime": "Tempo total: {{hours}}h {{minutes}}m",
                "startLearning": "Começar a Aprender",
                "progress": "Progresso",
                "weakDomainReason": "Recomendado para fortalecer {{domain}} (atual: {{score}}%)",
                "strongDomainReason": "Desafio avançado para suas fortes habilidades de {{domain}} ({{score}}%)",
                "averageDomainReason": "Continue construindo expertise em {{domain}} (atual: {{score}}%)",
                "goToDashboard": "Ir para o Painel",
                "dashboardHint": "Acompanhe seu progresso geral e continue sua jornada de aprendizagem"
            }
        },
        "ru": {
            "learningPath": {
                "title": "Ваш персонализированный путь обучения",
                "subtitle": "На основе результатов вашей оценки, вот ваше рекомендуемое путешествие обучения",
                "yourProgress": "Обзор вашего прогресса",
                "currentScore": "Текущий",
                "target": "Цель",
                "completed": "завершено",
                "filteringBy": "Показаны рекомендации для: {{domain}}",
                "clearFilter": "Показать все рекомендации",
                "recommendedPath": "Рекомендуемый путь обучения",
                "estimatedTime": "Общее время: {{hours}}ч {{minutes}}м",
                "startLearning": "Начать обучение",
                "progress": "Прогресс",
                "weakDomainReason": "Рекомендуется для укрепления {{domain}} (текущий: {{score}}%)",
                "strongDomainReason": "Продвинутый вызов для ваших сильных навыков {{domain}} ({{score}}%)",
                "averageDomainReason": "Продолжайте развивать экспертизу в {{domain}} (текущий: {{score}}%)",
                "goToDashboard": "Перейти к панели управления",
                "dashboardHint": "Отслеживайте свой общий прогресс и продолжайте свое путешествие обучения"
            }
        },
        "zhCN": {
            "learningPath": {
                "title": "您的个性化学习路径",
                "subtitle": "基于您的评估结果，这是您推荐的学习之旅",
                "yourProgress": "您的进度概览",
                "currentScore": "当前",
                "target": "目标",
                "completed": "已完成",
                "filteringBy": "显示推荐：{{domain}}",
                "clearFilter": "显示所有推荐",
                "recommendedPath": "推荐学习路径",
                "estimatedTime": "总时间：{{hours}}小时{{minutes}}分钟",
                "startLearning": "开始学习",
                "progress": "进度",
                "weakDomainReason": "建议加强{{domain}}（当前：{{score}}%）",
                "strongDomainReason": "为您强大的{{domain}}技能（{{score}}%）提供高级挑战",
                "averageDomainReason": "继续建立{{domain}}专业知识（当前：{{score}}%）",
                "goToDashboard": "前往仪表板",
                "dashboardHint": "跟踪您的整体进度并继续您的学习之旅"
            }
        },
        "zhTW": {
            "learningPath": {
                "title": "您的個人化學習路徑",
                "subtitle": "基於您的評估結果，這是您推薦的學習之旅",
                "yourProgress": "您的進度概覽",
                "currentScore": "當前",
                "target": "目標",
                "completed": "已完成",
                "filteringBy": "顯示推薦：{{domain}}",
                "clearFilter": "顯示所有推薦",
                "recommendedPath": "推薦學習路徑",
                "estimatedTime": "總時間：{{hours}}小時{{minutes}}分鐘",
                "startLearning": "開始學習",
                "progress": "進度",
                "weakDomainReason": "建議加強{{domain}}（當前：{{score}}%）",
                "strongDomainReason": "為您強大的{{domain}}技能（{{score}}%）提供高級挑戰",
                "averageDomainReason": "繼續建立{{domain}}專業知識（當前：{{score}}%）",
                "goToDashboard": "前往儀表板",
                "dashboardHint": "追蹤您的整體進度並繼續您的學習之旅"
            }
        }
    }
}

def is_placeholder(value: str, lang: str) -> bool:
    """Check if a value is a placeholder that needs translation."""
    if not isinstance(value, str):
        return False
    
    # Language name mapping
    lang_names = {
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
    
    lang_name = lang_names.get(lang, lang)
    
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

def get_translation(file_type: str, lang: str, key_path: list):
    """Get translation for a specific key path."""
    if file_type not in TRANSLATIONS or lang not in TRANSLATIONS[file_type]:
        return None
    
    translation = TRANSLATIONS[file_type][lang]
    try:
        for key in key_path:
            translation = translation[key]
        return translation
    except (KeyError, TypeError):
        return None

def translate_value(value: Any, lang: str, file_type: str, key_path: list) -> Any:
    """Translate a value based on its key path and language."""
    if isinstance(value, dict):
        # Recursively translate nested objects
        result = {}
        for k, v in value.items():
            new_path = key_path + [k]
            result[k] = translate_value(v, lang, file_type, new_path)
        return result
    elif isinstance(value, list):
        # Translate list items
        return [translate_value(item, lang, file_type, key_path) for item in value]
    elif isinstance(value, str) and is_placeholder(value, lang):
        # Try to get translation
        translation = get_translation(file_type, lang, key_path)
        if translation is not None:
            return translation
    
    return value

def process_file(file_path: Path, lang: str) -> Tuple[bool, int, int]:
    """Process a single JSON file and translate placeholders."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        file_type = file_path.stem
        original_json = json.dumps(data, sort_keys=True)
        
        # Count placeholders before
        placeholder_count_before = count_placeholders(data, lang)
        
        # Translate the data
        translated_data = translate_value(data, lang, file_type, [])
        
        # Count placeholders after
        placeholder_count_after = count_placeholders(translated_data, lang)
        
        # Check if anything changed
        new_json = json.dumps(translated_data, sort_keys=True)
        if original_json != new_json:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(translated_data, f, ensure_ascii=False, indent=2)
            return True, placeholder_count_before, placeholder_count_before - placeholder_count_after
        
        return False, placeholder_count_before, 0
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False, 0, 0

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
    total_placeholders_translated = 0
    total_placeholders_remaining = 0
    
    print("Starting comprehensive translation of locale files...")
    print("=" * 70)
    
    for lang in languages:
        lang_dir = base_dir / lang
        if not lang_dir.exists():
            print(f"\nSkipping {lang}: directory not found")
            continue
        
        lang_names = {
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
        
        print(f"\nProcessing {lang_names.get(lang, lang)} ({lang}):")
        print("-" * 50)
        
        lang_files_processed = 0
        lang_translated = 0
        lang_remaining = 0
        
        # Process priority files first
        for priority_file in priority_files:
            file_path = lang_dir / priority_file
            if file_path.exists():
                changed, before, translated = process_file(file_path, lang)
                remaining = before - translated
                
                if changed:
                    print(f"  ✓ {priority_file}: translated {translated}/{before} placeholders")
                    lang_files_processed += 1
                elif before > 0:
                    print(f"  ⚠ {priority_file}: {before} placeholders need manual translation")
                else:
                    print(f"  ✓ {priority_file}: fully translated")
                
                lang_translated += translated
                lang_remaining += remaining
        
        # Process other files
        for file_path in sorted(lang_dir.glob("*.json")):
            if file_path.name not in priority_files:
                changed, before, translated = process_file(file_path, lang)
                remaining = before - translated
                
                if changed:
                    print(f"  ✓ {file_path.name}: translated {translated}/{before} placeholders")
                    lang_files_processed += 1
                elif before > 0 and file_path.name in ["onboarding.json", "learningPath.json", "legal.json"]:
                    # Only report placeholders for important files
                    print(f"  ⚠ {file_path.name}: {before} placeholders need manual translation")
                
                lang_translated += translated
                lang_remaining += remaining
        
        if lang_files_processed > 0:
            print(f"\n  Summary: {lang_files_processed} files updated, {lang_translated} translations added")
            if lang_remaining > 0:
                print(f"  {lang_remaining} placeholders still need manual translation")
        
        total_files_processed += lang_files_processed
        total_placeholders_translated += lang_translated
        total_placeholders_remaining += lang_remaining
    
    print("\n" + "=" * 70)
    print(f"Translation complete!")
    print(f"Total files updated: {total_files_processed}")
    print(f"Total placeholders translated: {total_placeholders_translated}")
    if total_placeholders_remaining > 0:
        print(f"Total placeholders remaining: {total_placeholders_remaining}")
    print("\nNote: Some domain-specific terms in less critical files may still need manual translation.")

if __name__ == "__main__":
    main()