/**
 * BIMsmarter Audit Flash v8
 * - Panneau Audit Flash SÉPARÉ (ne modifie pas le panneau React)
 * - Cacher/Montrer au lieu de remplacer innerHTML
 * - Bouton stable dans la sidebar
 * - Compatible avec Propriétés et Audit IDS
 */

(function () {
    'use strict';

    const WEBHOOK_URL = 'https://n8n.bimsmarter.eu/webhook/audit-ifc';
    let currentAudit = null;
    let currentIfcFile = null;
    let isAuditFlashActive = false;
    let chatHeight = 250;
    const MIN_CHAT_HEIGHT = 150;
    const MAX_CHAT_HEIGHT = 500;
    let afPanelCreated = false;

    const AUDIT_POINTS = [
        { id: 'A1', name: 'Schéma IFC', cat: 'Structure', crit: 'CRITIQUE', attendu: 'FILE_SCHEMA reconnu (IFC2X3, IFC4)', question: 'Comment vérifier et corriger la version du schéma IFC dans Revit ou Archicad ? Donne-moi les étapes précises.' },
        { id: 'A2', name: 'Unicité Projet/Site', cat: 'Structure', crit: 'CRITIQUE', attendu: '1 IFCPROJECT et 1 IFCSITE', question: 'Mon IFC contient plusieurs IFCPROJECT ou IFCSITE. Quelles sont les étapes pour corriger cela dans Revit ou Archicad ?' },
        { id: 'A3', name: 'Hiérarchie IFC', cat: 'Structure', crit: 'CRITIQUE', attendu: 'IFCBUILDING + IFCBUILDINGSTOREY', question: 'La hiérarchie IFC est incomplète. Comment créer correctement la structure IFCPROJECT > IFCSITE > IFCBUILDING > IFCBUILDINGSTOREY ?' },
        { id: 'A4', name: 'GUID Uniques', cat: 'Structure', crit: 'CRITIQUE', attendu: '0 doublon de GUID', question: 'Mon IFC contient des GUID en doublon. Quelles sont les causes et comment les corriger concrètement ?' },
        { id: 'A5', name: 'Noms étages', cat: 'Structure', crit: 'IMPORTANTE', attendu: 'Noms uniques', question: 'J\'ai des noms d\'étages en doublon. Comment renommer mes niveaux correctement dans Revit/Archicad ?' },
        { id: 'A6', name: 'Étages vides', cat: 'Structure', crit: 'IMPORTANTE', attendu: 'Aucun étage vide', question: 'Mon IFC contient des étages vides. Dois-je les supprimer ? Comment nettoyer ma maquette ?' },
        { id: 'B1', name: 'Éléments Proxy', cat: 'Données', crit: 'IMPORTANTE', attendu: '<5% de Proxy', question: 'J\'ai trop d\'éléments Proxy. Comment les reclasser dans les bonnes catégories IFC depuis Revit/Archicad ?' },
        { id: 'B2', name: 'Matériaux', cat: 'Données', crit: 'IMPORTANTE', attendu: '≥80% avec matériaux', question: 'Mes éléments n\'ont pas de matériaux dans l\'IFC. Comment configurer l\'export des matériaux dans Revit/Archicad ?' },
        { id: 'B3', name: 'LoadBearing', cat: 'Données', crit: 'IMPORTANTE', attendu: 'Propriété renseignée', question: 'La propriété LoadBearing manque. Comment l\'ajouter à mes murs et dalles dans Revit/Archicad ?' },
        { id: 'B4', name: 'IsExternal', cat: 'Données', crit: 'MOYENNE', attendu: 'Propriété renseignée', question: 'La propriété IsExternal manque. Comment distinguer intérieur/extérieur lors de l\'export IFC ?' },
        { id: 'B5', name: 'Noms instances', cat: 'Données', crit: 'IMPORTANTE', attendu: 'Noms significatifs', question: 'Mes éléments ont des noms vides ou génériques. Comment mettre en place une convention de nommage ?' },
        { id: 'B6', name: 'BaseQuantities', cat: 'Données', crit: 'MOYENNE', attendu: 'Quantités exportées', question: 'Les BaseQuantities ne sont pas exportées. Comment activer cette option dans Revit/Archicad ?' },
        { id: 'B7', name: 'Langue', cat: 'Données', crit: 'MOYENNE', attendu: 'Langue cohérente', question: 'Mon IFC mélange plusieurs langues. Comment uniformiser la langue de l\'export ?' },
        { id: 'C1', name: 'Espaces', cat: 'Qualité', crit: 'IMPORTANTE', attendu: 'IFCSPACE présents', question: 'Mon IFC ne contient pas d\'espaces. Comment créer et exporter les pièces/locaux dans Revit/Archicad ?' },
        { id: 'C2', name: 'Ouvertures', cat: 'Qualité', crit: 'IMPORTANTE', attendu: 'Portes/fenêtres insérées', question: 'J\'ai des portes/fenêtres orphelines. Comment m\'assurer qu\'elles sont correctement insérées dans les murs ?' },
        { id: 'C3', name: 'Purge', cat: 'Qualité', crit: 'MOYENNE', attendu: 'Fichier purgé', question: 'Mon IFC contient des éléments inutiles. Comment purger ma maquette avant l\'export ?' },
        { id: 'C4', name: 'Taille fichier', cat: 'Qualité', crit: 'MOYENNE', attendu: '<300 Mo', question: 'Mon fichier IFC est très volumineux. Quelles techniques pour réduire sa taille sans perdre d\'informations ?' },
        { id: 'D1', name: 'Systèmes MEP', cat: 'MEP', crit: 'IMPORTANTE', attendu: 'IFCSYSTEM définis', question: 'Les systèmes MEP ne sont pas définis. Comment créer et exporter les systèmes CVC/Plomberie/Électricité ?' },
        { id: 'D2', name: 'Ports MEP', cat: 'MEP', crit: 'IMPORTANTE', attendu: 'Ports présents', question: 'Les ports de connexion MEP sont absents. Comment activer l\'export des connecteurs dans Revit MEP ?' },
        { id: 'D3', name: 'Zones CVC', cat: 'MEP', crit: 'IMPORTANTE', attendu: 'IFCZONE définies', question: 'Les zones CVC ne sont pas exportées. Comment créer et exporter les zones thermiques ?' }
    ];

    // ========== STYLES ==========
    const css = `
        /* ===== DÉPLACER BULLE IA À GAUCHE ===== */
        .fixed.bottom-5.right-5,
        .fixed.bottom-24.right-5,
        div[class*="fixed"][class*="bottom-5"][class*="right-5"],
        div[class*="fixed"][class*="bottom-24"][class*="right-5"] {
            right: auto !important;
            left: 1.25rem !important;
        }

        /* ===== BOUTON SIDEBAR AUDIT FLASH ===== */
        #af-sidebar-btn {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            transition: all 0.2s;
            text-align: left;
            background: transparent;
            border: none;
            color: rgb(148, 163, 184);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
        }
        #af-sidebar-btn:hover {
            background: rgba(51, 65, 85, 0.5);
            color: white;
        }
        #af-sidebar-btn.active {
            background: hsla(199, 89%, 48%, 0.2);
            color: hsl(199, 89%, 48%);
            border: 1px solid hsla(199, 89%, 48%, 0.3);
        }
        #af-sidebar-btn svg {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }

        /* ===== BOUTON HEADER ===== */
        #af-header-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.15));
            border: 1px solid rgba(6, 182, 212, 0.4);
            border-radius: 20px;
            color: #06b6d4;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-left: 8px;
        }
        #af-header-btn:hover {
            background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(139, 92, 246, 0.25));
            transform: scale(1.02);
        }

        /* ===== PANNEAU AUDIT FLASH (positionné dans le flux, pas en overlay) ===== */
        #af-panel {
            display: none;
            flex-direction: column;
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            background: #0f172a;
            z-index: 10;
        }
        #af-panel.visible {
            display: flex;
        }

        /* ===== WRAPPER PANNEAU DROIT ===== */
        .af-right-panel-wrapper {
            position: relative;
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        /* Cacher le contenu React quand Audit Flash est actif */
        .af-react-hidden > *:not(#af-panel):not(.af-right-panel-wrapper) {
            display: none !important;
        }

        .af-no-ifc, .af-ready {
            padding: 20px 16px;
            text-align: center;
        }
        .af-no-ifc {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #6b7280;
        }
        .af-no-ifc svg { width: 64px; height: 64px; margin-bottom: 20px; opacity: 0.4; }
        .af-no-ifc p { margin: 0 0 8px 0; font-size: 0.9rem; }
        .af-no-ifc .hint { font-size: 0.8rem; color: #4b5563; }
        
        .af-file-info {
            background: rgba(6, 182, 212, 0.1);
            border: 1px solid rgba(6, 182, 212, 0.2);
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .af-file-icon {
            width: 36px;
            height: 36px;
            background: rgba(6, 182, 212, 0.2);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #06b6d4;
        }
        .af-file-details { text-align: left; flex: 1; min-width: 0; }
        .af-file-name {
            font-weight: 600;
            color: #f3f4f6;
            font-size: 0.8rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .af-file-size { font-size: 0.7rem; color: #9ca3af; }
        .af-launch-btn {
            width: 100%;
            padding: 12px 20px;
            background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
            border: none;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            font-size: 0.85rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.2s;
        }
        .af-launch-btn:hover:not(:disabled) {
            box-shadow: 0 4px 20px rgba(6, 182, 212, 0.4);
        }
        .af-launch-btn:disabled { background: #374151; cursor: not-allowed; }
        .af-spinner {
            width: 16px; height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: af-spin 0.8s linear infinite;
        }
        @keyframes af-spin { to { transform: rotate(360deg); } }
        
        .af-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            border-bottom: 1px solid rgba(6, 182, 212, 0.2);
        }
        .af-header h2 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: hsl(199, 89%, 48%);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .af-content { flex: 1; overflow-y: auto; padding: 16px; }
        .af-score-card { display: flex; gap: 12px; margin-bottom: 12px; }
        .af-gauge-container { width: 100px; flex-shrink: 0; }
        .af-gauge { width: 100px; height: 100px; position: relative; }
        .af-gauge svg { transform: rotate(-90deg); }
        .af-gauge-bg { fill: none; stroke: rgba(255, 255, 255, 0.05); stroke-width: 10; }
        .af-gauge-fill {
            fill: none;
            stroke-width: 10;
            stroke-linecap: round;
            stroke-dasharray: 251;
            stroke-dashoffset: 251;
            transition: stroke-dashoffset 1s ease-out;
        }
        .af-score-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }
        .af-score-num { font-size: 1.4rem; font-weight: 700; display: block; color: #f3f4f6; }
        .af-score-grade { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; }
        .af-stats-box { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .af-stat { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 8px; text-align: center; }
        .af-stat-label { font-size: 0.55rem; color: #6b7280; text-transform: uppercase; margin-bottom: 2px; }
        .af-stat-value { font-size: 0.75rem; font-weight: 600; color: #f3f4f6; }
        .af-section-title {
            font-size: 0.65rem;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 12px 0 8px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .af-section-title::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.05); }
        .af-checks-list {
            background: rgba(17, 24, 39, 0.5);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 10px;
            overflow: hidden;
        }
        .af-check-row {
            display: flex;
            align-items: center;
            padding: 8px 10px;
            cursor: pointer;
            transition: background 0.2s;
            border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .af-check-row:hover { background: rgba(255,255,255,0.03); }
        .af-check-status {
            width: 22px; height: 22px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.65rem;
            font-weight: 700;
            margin-right: 8px;
            flex-shrink: 0;
        }
        .af-check-status.pass { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        .af-check-status.fail { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .af-check-status.warn { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .af-check-info { flex: 1; min-width: 0; }
        .af-check-title { font-size: 0.75rem; color: #e5e7eb; display: flex; align-items: center; gap: 4px; }
        .af-check-id { font-size: 0.6rem; color: #6b7280; font-weight: 600; }
        .af-check-meta { font-size: 0.6rem; color: #4b5563; }
        .af-crit-badge { font-size: 0.5rem; padding: 2px 4px; border-radius: 3px; font-weight: 600; margin-left: auto; }
        .af-crit-badge.critique { background: rgba(239, 68, 68, 0.1); color: #f87171; }
        .af-crit-badge.importante { background: rgba(251, 146, 60, 0.1); color: #fb923c; }
        .af-crit-badge.moyenne { background: rgba(250, 204, 21, 0.1); color: #facc15; }
        .af-check-score { font-size: 0.7rem; font-weight: 600; margin-left: 8px; min-width: 35px; text-align: right; }
        .af-check-score.pass { color: #10b981; }
        .af-check-score.fail { color: #ef4444; }
        .af-check-score.warn { color: #f59e0b; }
        .af-check-details {
            display: none;
            background: rgba(0, 0, 0, 0.3);
            padding: 10px 10px 10px 40px;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            font-size: 0.7rem;
            line-height: 1.5;
        }
        .af-check-details.visible { display: block; }
        .af-detail-row { display: flex; margin-bottom: 4px; }
        .af-detail-label { color: #6b7280; width: 70px; flex-shrink: 0; }
        .af-detail-value { color: #d1d5db; }
        .af-detail-value.found { color: #06b6d4; }
        .af-ask-groq-btn {
            margin-top: 8px;
            padding: 8px 12px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            border: none;
            border-radius: 6px;
            color: white;
            font-size: 0.7rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .af-ask-groq-btn:hover { box-shadow: 0 2px 10px rgba(245, 158, 11, 0.4); }

        /* ===== CHAT GROQ ===== */
        .af-chat-section {
            border-top: 1px solid rgba(255,255,255,0.05);
            background: #0b0f1a;
            display: flex;
            flex-direction: column;
            min-height: 150px;
            position: relative;
        }
        .af-chat-resize-handle {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            cursor: ns-resize;
            background: transparent;
            transition: background 0.2s;
        }
        .af-chat-resize-handle:hover, .af-chat-resize-handle.active {
            background: rgba(6, 182, 212, 0.5);
        }
        .af-chat-header {
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .af-chat-header h3 { margin: 0; font-size: 0.8rem; color: #f3f4f6; }
        .af-chat-header span { font-size: 0.65rem; color: #06b6d4; }
        .af-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .af-msg {
            padding: 8px 12px;
            border-radius: 10px;
            max-width: 90%;
            font-size: 0.75rem;
            line-height: 1.4;
        }
        .af-msg-ai {
            background: #1f2937;
            align-self: flex-start;
            border-bottom-left-radius: 2px;
            color: #e5e7eb;
        }
        .af-msg-user {
            background: #06b6d4;
            color: #000;
            align-self: flex-end;
            border-bottom-right-radius: 2px;
            font-weight: 500;
        }
        .af-chat-input-area {
            padding: 10px;
            border-top: 1px solid rgba(255,255,255,0.05);
            display: flex;
            gap: 8px;
        }
        .af-chat-input {
            flex: 1;
            background: #1f2937;
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 8px;
            padding: 8px 10px;
            color: #fff;
            outline: none;
            font-size: 0.75rem;
        }
        .af-chat-input:focus { border-color: rgba(6, 182, 212, 0.5); }
        .af-chat-send {
            background: #06b6d4;
            border: none;
            border-radius: 8px;
            color: #000;
            padding: 8px 12px;
            font-weight: 600;
            cursor: pointer;
        }
        .af-chat-send:hover { background: #0891b2; }

        /* ===== MODAL ===== */
        .af-modal-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 10001;
            display: none;
            align-items: center;
            justify-content: center;
        }
        .af-modal-overlay.visible { display: flex; }
        .af-modal {
            background: #111827;
            border: 1px solid rgba(6, 182, 212, 0.2);
            border-radius: 16px;
            width: 90%;
            max-width: 700px;
            max-height: 85vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .af-modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .af-modal-header h3 { margin: 0; font-size: 1rem; color: #f3f4f6; }
        .af-modal-close {
            background: rgba(255,255,255,0.05);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            color: #9ca3af;
            font-size: 1.2rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .af-modal-close:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .af-modal-content { padding: 20px; overflow-y: auto; flex: 1; }
        .af-doc-intro {
            background: rgba(6, 182, 212, 0.1);
            border-left: 3px solid #06b6d4;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 0.85rem;
            color: #d1d5db;
            line-height: 1.6;
        }
        .af-doc-category { margin-bottom: 20px; }
        .af-doc-category h4 {
            color: #06b6d4;
            font-size: 0.85rem;
            margin: 0 0 12px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .af-doc-point { background: rgba(255,255,255,0.02); border-radius: 8px; padding: 12px; margin-bottom: 8px; }
        .af-doc-point-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .af-doc-point-id { font-weight: 700; color: #9ca3af; font-size: 0.75rem; }
        .af-doc-point-name { font-weight: 600; color: #e5e7eb; font-size: 0.85rem; }
        .af-doc-point-desc { font-size: 0.8rem; color: #9ca3af; margin-bottom: 6px; }
        .af-doc-point-expected { font-size: 0.75rem; color: #6b7280; }
        .af-doc-point-expected strong { color: #10b981; }
        
        .af-content::-webkit-scrollbar, .af-modal-content::-webkit-scrollbar, .af-chat-messages::-webkit-scrollbar { width: 5px; }
        .af-content::-webkit-scrollbar-track, .af-modal-content::-webkit-scrollbar-track, .af-chat-messages::-webkit-scrollbar-track { background: transparent; }
        .af-content::-webkit-scrollbar-thumb, .af-modal-content::-webkit-scrollbar-thumb, .af-chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .af-hidden { display: none !important; }
    `;

    function injectStyles() {
        if (document.getElementById('af-styles')) return;
        var style = document.createElement('style');
        style.id = 'af-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function generateDocumentation() {
        var categories = {
            'Structure': AUDIT_POINTS.filter(function (p) { return p.cat === 'Structure'; }),
            'Données': AUDIT_POINTS.filter(function (p) { return p.cat === 'Données'; }),
            'Qualité': AUDIT_POINTS.filter(function (p) { return p.cat === 'Qualité'; }),
            'MEP': AUDIT_POINTS.filter(function (p) { return p.cat === 'MEP'; })
        };
        var html = '';
        for (var catName in categories) {
            var points = categories[catName];
            html += '<div class="af-doc-category"><h4>📁 ' + catName + ' (' + points.length + ' points)</h4>';
            points.forEach(function (p) {
                html += '<div class="af-doc-point"><div class="af-doc-point-header"><span class="af-doc-point-id">' + p.id + '</span><span class="af-doc-point-name">' + p.name + '</span><span class="af-crit-badge ' + p.crit.toLowerCase() + '">' + p.crit + '</span></div><div class="af-doc-point-desc">' + (p.desc || '') + '</div><div class="af-doc-point-expected">✓ Attendu : <strong>' + p.attendu + '</strong></div></div>';
            });
            html += '</div>';
        }
        return html;
    }

    // ========== Créer le panneau Audit Flash (une seule fois) ==========
    function createAuditFlashPanel() {
        if (afPanelCreated) return;

        var rightPanel = document.querySelector('.w-96.glass-panel.border-l');
        if (!rightPanel) return;

        // Ajouter position relative au panneau parent pour permettre le positionnement absolu
        rightPanel.style.position = 'relative';

        var panel = document.createElement('div');
        panel.id = 'af-panel';
        panel.innerHTML = `
            <div class="af-header">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    Audit Flash
                </h2>
            </div>
            <div class="af-content">
                <div class="af-no-ifc" id="af-no-ifc">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <p>Aucun fichier IFC chargé</p>
                    <p class="hint">Utilisez "Ouvrir IFC" dans le menu</p>
                </div>
                <div class="af-ready af-hidden" id="af-ready">
                    <div class="af-file-info">
                        <div class="af-file-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg></div>
                        <div class="af-file-details">
                            <div class="af-file-name" id="af-file-name">-</div>
                            <div class="af-file-size" id="af-file-size">-</div>
                        </div>
                    </div>
                    <button class="af-launch-btn" id="af-launch-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Lancer l'Audit Flash</span></button>
                </div>
                <div id="af-results" class="af-hidden">
                    <div class="af-score-card">
                        <div class="af-gauge-container"><div class="af-gauge"><svg width="100" height="100"><circle class="af-gauge-bg" cx="50" cy="50" r="40"/><circle id="af-gauge-fill" class="af-gauge-fill" cx="50" cy="50" r="40"/></svg><div class="af-score-text"><span id="af-score-num" class="af-score-num">0%</span><span id="af-score-grade" class="af-score-grade">-</span></div></div></div>
                        <div class="af-stats-box"><div class="af-stat"><div class="af-stat-label">Taille</div><div class="af-stat-value" id="af-stat-size">-</div></div><div class="af-stat"><div class="af-stat-label">Entités</div><div class="af-stat-value" id="af-stat-ent">-</div></div><div class="af-stat"><div class="af-stat-label">Schéma</div><div class="af-stat-value" id="af-stat-sch">-</div></div><div class="af-stat"><div class="af-stat-label">Réussis</div><div class="af-stat-value" id="af-stat-passed">-</div></div></div>
                    </div>
                    <div class="af-section-title">Points de contrôle</div>
                    <div class="af-checks-list" id="af-checks-list"></div>
                </div>
            </div>
            <div class="af-chat-section af-hidden" id="af-chat-section">
                <div class="af-chat-resize-handle" id="af-chat-resize-handle"></div>
                <div class="af-chat-header"><h3>💬 Assistant Expert Groq</h3><span>CRTI-B Luxembourg</span></div>
                <div id="af-chat-messages" class="af-chat-messages"><div class="af-msg af-msg-ai">Cliquez sur 💡 d'un point de contrôle pour obtenir de l'aide.</div></div>
                <div class="af-chat-input-area"><input type="text" id="af-chat-input" class="af-chat-input" placeholder="Posez une question..."><button class="af-chat-send" id="af-chat-send">➤</button></div>
            </div>
        `;

        rightPanel.appendChild(panel);
        afPanelCreated = true;

        setupAuditFlashEvents();
    }

    function createModal() {
        if (document.getElementById('af-modal')) return;

        var modal = document.createElement('div');
        modal.className = 'af-modal-overlay';
        modal.id = 'af-modal';
        modal.innerHTML = '<div class="af-modal"><div class="af-modal-header"><h3>⚡ Fonctionnement de l\'Audit Flash</h3><button class="af-modal-close" id="af-modal-close">×</button></div><div class="af-modal-content"><div class="af-doc-intro"><strong>Audit IFC Flash - 20 Points de Contrôle</strong><br>Contrôle qualité rapide basé sur les standards CRTI-B Luxembourg, Solibri et buildingSMART.<br>Exécutable en moins de 60 secondes, 100% automatisé.</div>' + generateDocumentation() + '</div></div>';
        document.body.appendChild(modal);

        document.getElementById('af-modal-close').addEventListener('click', function () {
            document.getElementById('af-modal').classList.remove('visible');
        });
        document.getElementById('af-modal').addEventListener('click', function (e) {
            if (e.target.id === 'af-modal') document.getElementById('af-modal').classList.remove('visible');
        });
    }

    // ========== INJECTION BOUTON SIDEBAR ==========
    function injectSidebarButton() {
        if (document.getElementById('af-sidebar-btn')) return;

        var allButtons = document.querySelectorAll('button');
        var auditIdsBtn = null;
        for (var i = 0; i < allButtons.length; i++) {
            if (allButtons[i].textContent.trim().includes('Audit IDS') && !allButtons[i].id) {
                auditIdsBtn = allButtons[i];
                break;
            }
        }

        if (!auditIdsBtn) return;

        var btn = document.createElement('button');
        btn.id = 'af-sidebar-btn';
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg><span class="font-medium">Audit Flash</span>';
        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            activateAuditFlash();
        };

        auditIdsBtn.insertAdjacentElement('afterend', btn);
    }

    function checkButtonPosition() {
        var afBtn = document.getElementById('af-sidebar-btn');
        if (!afBtn) return false;

        var prevSibling = afBtn.previousElementSibling;
        if (prevSibling && prevSibling.textContent.trim().includes('Audit IDS')) {
            return true;
        }

        afBtn.remove();
        return false;
    }

    // ========== INJECTION BOUTON HEADER ==========
    function injectHeaderButton() {
        if (document.getElementById('af-header-btn')) return;

        var aiPoweredBadge = null;
        var spans = document.querySelectorAll('span');
        for (var i = 0; i < spans.length; i++) {
            if (spans[i].textContent.includes('AI-Powered')) {
                aiPoweredBadge = spans[i].closest('span, div');
                break;
            }
        }

        if (!aiPoweredBadge) return;

        var btn = document.createElement('button');
        btn.id = 'af-header-btn';
        btn.innerHTML = '⚡ Fonctionnement de l\'Audit Flash - 20 Points';
        btn.title = 'Voir le fonctionnement de l\'Audit Flash';
        btn.onclick = function () {
            document.getElementById('af-modal').classList.add('visible');
        };

        aiPoweredBadge.parentNode.insertBefore(btn, aiPoweredBadge.nextSibling);
    }

    // ========== Activer/Désactiver Audit Flash ==========
    function activateAuditFlash() {
        createAuditFlashPanel();

        var panel = document.getElementById('af-panel');
        if (!panel) return;

        // Désactiver visuellement les autres boutons de la sidebar
        var sidebarButtons = document.querySelectorAll('.w-56.glass-panel button');
        sidebarButtons.forEach(function (btn) {
            if (btn.id !== 'af-sidebar-btn') {
                // Retirer les classes Tailwind actives utilisées par React
                btn.classList.remove('bg-[hsl(199,89%,48%,0.2)]', 'text-[hsl(199,89%,48%)]', 'border', 'border-[hsl(199,89%,48%,0.3)]');
                // Ajouter les classes inactives
                btn.classList.add('text-slate-400');
                // Retirer aussi les styles inline potentiels
                btn.style.background = '';
                btn.style.color = '';
                btn.style.border = '';
            }
        });

        // Montrer notre panneau
        panel.classList.add('visible');

        // Activer notre bouton
        var afBtn = document.getElementById('af-sidebar-btn');
        if (afBtn) {
            afBtn.classList.add('active');
        }

        isAuditFlashActive = true;
        checkExistingIfcFile();
    }


    function deactivateAuditFlash() {
        var panel = document.getElementById('af-panel');
        if (panel) {
            panel.classList.remove('visible');
        }

        var afBtn = document.getElementById('af-sidebar-btn');
        if (afBtn) {
            afBtn.classList.remove('active');
        }

        isAuditFlashActive = false;
    }

    // ========== Configurer les événements ==========
    function setupAuditFlashEvents() {
        var launchBtn = document.getElementById('af-launch-btn');
        if (launchBtn) {
            launchBtn.addEventListener('click', launchAudit);
        }

        var chatSend = document.getElementById('af-chat-send');
        if (chatSend) {
            chatSend.addEventListener('click', sendMessage);
        }

        var chatInput = document.getElementById('af-chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') sendMessage();
            });
        }

        setupChatResize();
    }

    // ========== Détecter les clics sur les autres boutons ==========
    function setupOtherButtonsListener() {
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('button');
            if (btn && btn.id !== 'af-sidebar-btn' && btn.id !== 'af-header-btn' && btn.id !== 'af-launch-btn' && btn.id !== 'af-chat-send' && btn.id !== 'af-modal-close') {
                var sidebar = btn.closest('.w-56.glass-panel');
                if (sidebar) {
                    if (btn.textContent.includes('Propriétés') || btn.textContent.includes('Audit IDS')) {
                        deactivateAuditFlash();
                    }
                }
            }
        }, true);
    }

    function setupChatResize() {
        var handle = document.getElementById('af-chat-resize-handle');
        var chatSection = document.getElementById('af-chat-section');
        if (!handle || !chatSection) return;

        var isResizing = false;
        var startY, startHeight;

        handle.addEventListener('mousedown', function (e) {
            isResizing = true;
            startY = e.clientY;
            startHeight = chatSection.offsetHeight;
            handle.classList.add('active');
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!isResizing) return;
            var delta = startY - e.clientY;
            var newHeight = startHeight + delta;
            if (newHeight >= MIN_CHAT_HEIGHT && newHeight <= MAX_CHAT_HEIGHT) {
                chatSection.style.height = newHeight + 'px';
                chatHeight = newHeight;
            }
        });

        document.addEventListener('mouseup', function () {
            if (isResizing) {
                isResizing = false;
                handle.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    function setupFileCapture() {
        document.addEventListener('change', function (e) {
            if (e.target && e.target.type === 'file') {
                var file = e.target.files && e.target.files[0];
                if (file && file.name.toLowerCase().endsWith('.ifc')) {
                    currentIfcFile = file;
                    updateFileUI(file);
                }
            }
        }, true);
    }

    function checkExistingIfcFile() {
        var fileIndicator = document.querySelector('.w-56.glass-panel .truncate');
        if (fileIndicator && fileIndicator.textContent && fileIndicator.textContent.endsWith('.ifc')) {
            var noIfcEl = document.getElementById('af-no-ifc');
            var readyEl = document.getElementById('af-ready');
            if (noIfcEl) noIfcEl.classList.add('af-hidden');
            if (readyEl) {
                readyEl.classList.remove('af-hidden');
                var fileNameEl = document.getElementById('af-file-name');
                if (fileNameEl) fileNameEl.textContent = fileIndicator.textContent;
            }
        }
    }

    function updateFileUI(file) {
        var noIfcEl = document.getElementById('af-no-ifc');
        var readyEl = document.getElementById('af-ready');
        if (noIfcEl) noIfcEl.classList.add('af-hidden');
        if (readyEl) readyEl.classList.remove('af-hidden');

        var fileNameEl = document.getElementById('af-file-name');
        var fileSizeEl = document.getElementById('af-file-size');
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = (file.size / 1048576).toFixed(2) + ' Mo';
    }

    async function launchAudit() {
        if (!currentIfcFile) {
            alert('Aucun fichier IFC chargé. Ouvrez d\'abord un fichier IFC via le menu.');
            return;
        }
        var btn = document.getElementById('af-launch-btn');
        if (!btn) return;

        btn.disabled = true;
        btn.innerHTML = '<div class="af-spinner"></div><span>Analyse...</span>';

        try {
            var formData = new FormData();
            formData.append('data', currentIfcFile);
            var response = await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Erreur HTTP ' + response.status);
            var data = await response.json();
            if (!data || !data.score) throw new Error('Réponse invalide');

            currentAudit = data;
            renderResults(data);

            var readyEl = document.getElementById('af-ready');
            var resultsEl = document.getElementById('af-results');
            var chatEl = document.getElementById('af-chat-section');

            if (readyEl) readyEl.classList.add('af-hidden');
            if (resultsEl) resultsEl.classList.remove('af-hidden');
            if (chatEl) {
                chatEl.classList.remove('af-hidden');
                chatEl.style.height = chatHeight + 'px';
            }

        } catch (err) {
            alert('Erreur: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg><span>Relancer</span>';
        }
    }

    function renderResults(data) {
        var score = data.score || { total: 0, grade: 'F' };
        var file = data.file || {};
        var checks = data.all_checks || [];

        var scoreNumEl = document.getElementById('af-score-num');
        var scoreGradeEl = document.getElementById('af-score-grade');
        if (scoreNumEl) scoreNumEl.textContent = score.total + '%';
        if (scoreGradeEl) scoreGradeEl.textContent = 'GRADE ' + score.grade;

        var colors = { A: '#10b981', B: '#06b6d4', C: '#f59e0b', D: '#f97316', F: '#ef4444' };
        var color = colors[score.grade] || '#06b6d4';
        var gaugeFill = document.getElementById('af-gauge-fill');
        if (gaugeFill) {
            gaugeFill.style.stroke = color;
        }
        if (scoreGradeEl) scoreGradeEl.style.color = color;

        var offset = 251 - (251 * score.total / 100);
        if (gaugeFill) gaugeFill.style.strokeDashoffset = offset;

        var statSizeEl = document.getElementById('af-stat-size');
        var statEntEl = document.getElementById('af-stat-ent');
        var statSchEl = document.getElementById('af-stat-sch');
        var statPassedEl = document.getElementById('af-stat-passed');

        if (statSizeEl) statSizeEl.textContent = (file.size || '-') + ' Mo';
        if (statEntEl) statEntEl.textContent = (file.entities || 0).toLocaleString();
        if (statSchEl) statSchEl.textContent = file.schema || '-';

        var passed = checks.filter(function (c) { return c.passed; }).length;
        if (statPassedEl) statPassedEl.textContent = passed + '/' + checks.length;

        var container = document.getElementById('af-checks-list');
        if (!container) return;
        container.innerHTML = '';

        checks.forEach(function (chk, idx) {
            var scoreVal = parseFloat(chk.score) || 0;
            var isPassed = chk.passed || scoreVal >= 90;
            var statusClass = isPassed ? 'pass' : (scoreVal >= 50 ? 'warn' : 'fail');
            var statusIcon = isPassed ? '✓' : (scoreVal >= 50 ? '!' : '✗');
            var critClass = (chk.criticality || 'moyenne').toLowerCase();
            var docPoint = AUDIT_POINTS.find(function (p) { return p.id === chk.id; }) || {};

            var row = document.createElement('div');
            row.className = 'af-check-row';
            row.onclick = function () { toggleDetail(idx); };
            row.innerHTML = '<div class="af-check-status ' + statusClass + '">' + statusIcon + '</div><div class="af-check-info"><div class="af-check-title"><span class="af-check-id">' + chk.id + '</span>' + chk.name + '</div><div class="af-check-meta">' + chk.cat + '</div></div><span class="af-crit-badge ' + critClass + '">' + chk.criticality + '</span><span class="af-check-score ' + statusClass + '">' + scoreVal + '%</span>';

            var details = document.createElement('div');
            details.className = 'af-check-details';
            details.id = 'af-detail-' + idx;
            details.innerHTML = '<div class="af-detail-row"><span class="af-detail-label">Trouvé :</span><span class="af-detail-value found">' + (chk.details || '-') + '</span></div><div class="af-detail-row"><span class="af-detail-label">Attendu :</span><span class="af-detail-value">' + (docPoint.attendu || '-') + '</span></div><button class="af-ask-groq-btn" data-point="' + chk.id + '">💡 Comment corriger ce problème ?</button>';

            container.appendChild(row);
            container.appendChild(details);
        });

        container.querySelectorAll('.af-ask-groq-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var pointId = btn.getAttribute('data-point');
                askGroqSpecific(pointId);
            });
        });
    }

    function toggleDetail(idx) {
        var el = document.getElementById('af-detail-' + idx);
        if (!el) return;
        var isVisible = el.classList.contains('visible');
        document.querySelectorAll('.af-check-details').forEach(function (d) { d.classList.remove('visible'); });
        if (!isVisible) el.classList.add('visible');
    }

    function askGroqSpecific(pointId) {
        var point = AUDIT_POINTS.find(function (p) { return p.id === pointId; });
        if (!point) return;

        var checkData = currentAudit && currentAudit.all_checks ?
            currentAudit.all_checks.find(function (c) { return c.id === pointId; }) : null;

        var specificMessage = 'INSTRUCTION IMPORTANTE: Réponds UNIQUEMENT à cette question précise. Ne fais PAS d\'analyse globale de l\'audit.\n\n' +
            'Question: ' + point.question + '\n\n' +
            'Contexte du point ' + pointId + ' (' + point.name + '):\n' +
            '- Résultat trouvé: ' + (checkData ? checkData.details : 'Non disponible') + '\n' +
            '- Attendu: ' + point.attendu + '\n\n' +
            'Donne des étapes concrètes et pratiques pour corriger ce problème spécifique dans Revit ou Archicad.';

        addChatMessage(point.question, 'user');
        sendMessageDirect(specificMessage);
    }

    async function sendMessageDirect(message) {
        try {
            var response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatMode: true,
                    message: message,
                    context: null
                })
            });
            var data = await response.json();

            var content = '';
            if (data.choices && data.choices[0]) {
                content = data.choices[0].message.content;
            } else if (data.groq && data.groq.choices && data.groq.choices[0]) {
                content = data.groq.choices[0].message.content;
            } else {
                content = 'Désolé, je n\'ai pas pu obtenir de réponse.';
            }
            addChatMessage(content, 'ai');
        } catch (err) {
            addChatMessage('Erreur réseau: ' + err.message, 'ai');
        }
    }

    async function sendMessage() {
        var input = document.getElementById('af-chat-input');
        if (!input) return;
        var text = input.value.trim();
        if (!text) return;

        addChatMessage(text, 'user');
        input.value = '';

        var message = 'Question de l\'utilisateur: ' + text + '\n\nRéponds de manière concise et pratique.';

        try {
            var response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatMode: true,
                    message: message,
                    context: currentAudit ? { score: currentAudit.score, file: currentAudit.file } : null
                })
            });
            var data = await response.json();

            var content = '';
            if (data.choices && data.choices[0]) {
                content = data.choices[0].message.content;
            } else if (data.groq && data.groq.choices && data.groq.choices[0]) {
                content = data.groq.choices[0].message.content;
            } else {
                content = 'Désolé, je n\'ai pas pu obtenir de réponse.';
            }
            addChatMessage(content, 'ai');
        } catch (err) {
            addChatMessage('Erreur réseau: ' + err.message, 'ai');
        }
    }

    function addChatMessage(text, sender) {
        var container = document.getElementById('af-chat-messages');
        if (!container) return;
        var div = document.createElement('div');
        div.className = 'af-msg af-msg-' + sender;
        div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // ========== MUTATION OBSERVER ==========
    function startObserver() {
        var observer = new MutationObserver(function (mutations) {
            if (!document.getElementById('af-sidebar-btn') || !checkButtonPosition()) {
                injectSidebarButton();
            }
            if (!document.getElementById('af-header-btn')) {
                injectHeaderButton();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function init() {
        injectStyles();
        createModal();
        setupOtherButtonsListener();
        setupFileCapture();

        var checkInterval = setInterval(function () {
            var sidebar = document.querySelector('.w-56.glass-panel');
            if (sidebar) {
                clearInterval(checkInterval);
                injectSidebarButton();
                injectHeaderButton();
                startObserver();
            }
        }, 200);

        setTimeout(function () { clearInterval(checkInterval); }, 10000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
