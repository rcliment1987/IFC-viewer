/**
 * BIMsmarter IDS Creator v2.0
 * - Mode simplifié (templates GID + MEP)
 * - Mode expert (création manuelle complète)
 * - Bouton d'aide "Fonctionnement de l'Audit IDS"
 */

(function () {
    'use strict';

    // === TEMPLATES STRUCTURE ===
    const TEMPLATES_STRUCTURE = [
        {
            id: 'wall-load-bearing', name: 'Murs porteurs', icon: '🧱', category: 'structure', entity: 'IFCWALL', predefinedType: 'SOLIDWALL', requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_WallCommon', name: 'LoadBearing', dataType: 'IFCBOOLEAN', cardinality: 'required' },
                { type: 'property', pset: 'Pset_WallCommon', name: 'Status', dataType: 'IFCLABEL', cardinality: 'required', enumValues: ['NEW', 'EXISTING', 'DEMOLISH'] },
                { type: 'classification', system: 'CFC', pattern: '[A-Z][0-9]{2}\\.[0-9]{2}', cardinality: 'required' },
                { type: 'material', cardinality: 'required' }
            ]
        },
        {
            id: 'wall-partition', name: 'Cloisons', icon: '🚪', category: 'structure', entity: 'IFCWALL', predefinedType: 'PARTITIONING', requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_WallCommon', name: 'Status', dataType: 'IFCLABEL', cardinality: 'required' },
                { type: 'classification', system: 'CFC', cardinality: 'required' }
            ]
        },
        {
            id: 'slab-floor', name: 'Dalles', icon: '⬛', category: 'structure', entity: 'IFCSLAB', predefinedType: 'FLOOR', requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_SlabCommon', name: 'LoadBearing', dataType: 'IFCBOOLEAN', cardinality: 'required' },
                { type: 'classification', system: 'CFC', cardinality: 'required' },
                { type: 'material', cardinality: 'required' }
            ]
        },
        {
            id: 'space', name: 'Espaces', icon: '📐', category: 'structure', entity: 'IFCSPACE', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'attribute', name: 'LongName', cardinality: 'required' },
                { type: 'property', pset: 'Pset_SpaceCommon', name: 'Category', dataType: 'IFCLABEL', cardinality: 'required' },
                { type: 'property', pset: 'Qto_SpaceBaseQuantities', name: 'NetFloorArea', dataType: 'IFCAREAMEASURE', cardinality: 'required' }
            ]
        },
        {
            id: 'door-fire', name: 'Portes coupe-feu', icon: '🚨', category: 'structure', entity: 'IFCDOOR', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_DoorCommon', name: 'FireRating', dataType: 'IFCLABEL', pattern: '(REI|EI)[0-9]{2,3}', cardinality: 'required' },
                { type: 'classification', system: 'CFC', cardinality: 'required' }
            ]
        },
        {
            id: 'window', name: 'Fenêtres', icon: '🪟', category: 'structure', entity: 'IFCWINDOW', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_WindowCommon', name: 'ThermalTransmittance', dataType: 'IFCREAL', cardinality: 'optional' },
                { type: 'classification', system: 'CFC', cardinality: 'required' }
            ]
        },
        {
            id: 'column', name: 'Colonnes', icon: '🏛️', category: 'structure', entity: 'IFCCOLUMN', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_ColumnCommon', name: 'LoadBearing', dataType: 'IFCBOOLEAN', cardinality: 'required' },
                { type: 'classification', system: 'CFC', cardinality: 'required' },
                { type: 'material', cardinality: 'required' }
            ]
        },
        {
            id: 'beam', name: 'Poutres', icon: '📏', category: 'structure', entity: 'IFCBEAM', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_BeamCommon', name: 'LoadBearing', dataType: 'IFCBOOLEAN', cardinality: 'required' },
                { type: 'classification', system: 'CFC', cardinality: 'required' },
                { type: 'material', cardinality: 'required' }
            ]
        }
    ];

    // === TEMPLATES MEP (Techniques Spéciales) ===
    const TEMPLATES_MEP = [
        {
            id: 'duct-ventilation', name: 'Gaines ventilation', icon: '💨', category: 'mep', entity: 'IFCDUCTSEGMENT', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_DuctSegmentTypeCommon', name: 'NominalDiameter', dataType: 'IFCLENGTHMEASURE', cardinality: 'required' },
                { type: 'property', pset: 'Pset_DuctSegmentTypeCommon', name: 'Status', dataType: 'IFCLABEL', cardinality: 'required' },
                { type: 'classification', system: 'CFC', cardinality: 'required' }
            ]
        },
        {
            id: 'pipe-segment', name: 'Tuyauterie', icon: '🔧', category: 'mep', entity: 'IFCPIPESEGMENT', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_PipeSegmentTypeCommon', name: 'NominalDiameter', dataType: 'IFCLENGTHMEASURE', cardinality: 'required' },
                { type: 'property', pset: 'Pset_PipeSegmentTypeCommon', name: 'WorkingPressure', dataType: 'IFCPRESSUREMEASURE', cardinality: 'optional' },
                { type: 'classification', system: 'CFC', cardinality: 'required' },
                { type: 'material', cardinality: 'required' }
            ]
        },
        {
            id: 'cable-tray', name: 'Chemins de câbles', icon: '🔌', category: 'mep', entity: 'IFCCABLECARRIERSEGMENT', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_CableCarrierSegmentTypeCableTraySegment', name: 'NominalWidth', dataType: 'IFCLENGTHMEASURE', cardinality: 'required' },
                { type: 'classification', system: 'CFC', cardinality: 'required' }
            ]
        },
        {
            id: 'light-fixture', name: 'Luminaires', icon: '💡', category: 'mep', entity: 'IFCLIGHTFIXTURE', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_LightFixtureTypeCommon', name: 'LightFixtureMountingType', dataType: 'IFCLABEL', cardinality: 'required' },
                { type: 'property', pset: 'Pset_LightFixtureTypeCommon', name: 'TotalWattage', dataType: 'IFCPOWERMEASURE', cardinality: 'optional' },
                { type: 'classification', system: 'CFC', cardinality: 'required' }
            ]
        },
        {
            id: 'sanitary-terminal', name: 'Équip. sanitaires', icon: '🚿', category: 'mep', entity: 'IFCSANITARYTERMINAL', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_SanitaryTerminalTypeCommon', name: 'Status', dataType: 'IFCLABEL', cardinality: 'required' },
                { type: 'classification', system: 'CFC', cardinality: 'required' }
            ]
        },
        {
            id: 'air-terminal', name: 'Bouches aération', icon: '🌬️', category: 'mep', entity: 'IFCAIRTERMINAL', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_AirTerminalTypeCommon', name: 'AirFlowRateRange', dataType: 'IFCVOLUMETRICFLOWRATEMEASURE', cardinality: 'optional' },
                { type: 'classification', system: 'CFC', cardinality: 'required' }
            ]
        },
        {
            id: 'fire-suppression', name: 'Sprinklers', icon: '🔥', category: 'mep', entity: 'IFCFIRESUPPRESSIONTERMINAL', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_FireSuppressionTerminalTypeSprinkler', name: 'CoverageArea', dataType: 'IFCAREAMEASURE', cardinality: 'required' },
                { type: 'classification', system: 'CFC', cardinality: 'required' }
            ]
        },
        {
            id: 'electrical-device', name: 'Prises électriques', icon: '⚡', category: 'mep', entity: 'IFCOUTLET', predefinedType: null, requirements: [
                { type: 'attribute', name: 'Name', cardinality: 'required' },
                { type: 'property', pset: 'Pset_OutletTypeCommon', name: 'Status', dataType: 'IFCLABEL', cardinality: 'required' },
                { type: 'classification', system: 'CFC', cardinality: 'required' }
            ]
        }
    ];

    const TEMPLATES = [...TEMPLATES_STRUCTURE, ...TEMPLATES_MEP];

    // === TOOLTIPS ===
    const TOOLTIPS = {
        title: "Nom de votre fiche IDS. Sera affiché dans les outils d'audit.",
        author: "Votre email ou nom d'organisation",
        ifcVersion: "IFC2X3 (~70% des projets) ou IFC4 (standard ISO)",
        phase: "Phase projet GID: APS, APD/AUT, PDE/SOU, EXE/ASB, EXP",
        entity: "Classe IFC en MAJUSCULES (IFCWALL, IFCSLAB...)",
        predefinedType: "Sous-type: SOLIDWALL, PARTITIONING, FLOOR...",
        pset: "PropertySet (Pset_WallCommon, Pset_SlabCommon...)",
        cardinality: "required=obligatoire | optional=si présent | prohibited=interdit",
        pattern: "Regex pour valider le format. Ex: [A-Z][0-9]{2}\\.[0-9]{2}",
        dataType: "IFCBOOLEAN, IFCLABEL, IFCREAL, IFCINTEGER...",
        specName: "Identifiant unique de la règle (ex: MUR-001)",
        minOccurs: "Nombre minimum d'éléments requis (0 = optionnel)",
        maxOccurs: "Nombre max (unbounded = illimité)",
        enumValues: "Valeurs autorisées séparées par virgule",
        classification: "Système de classification (CFC, Uniclass, OmniClass)"
    };

    // === IFC ENTITIES ===
    const IFC_ENTITIES = [
        'IFCWALL', 'IFCSLAB', 'IFCCOLUMN', 'IFCBEAM', 'IFCDOOR', 'IFCWINDOW',
        'IFCSPACE', 'IFCROOF', 'IFCSTAIR', 'IFCRAMP', 'IFCRAILING', 'IFCCURTAINWALL',
        'IFCFOOTING', 'IFCPILE', 'IFCMEMBER', 'IFCPLATE', 'IFCFURNITURE',
        'IFCDUCTSEGMENT', 'IFCPIPESEGMENT', 'IFCCABLESEGMENT', 'IFCCABLECARRIERSEGMENT',
        'IFCLIGHTFIXTURE', 'IFCSANITARYTERMINAL', 'IFCAIRTERMINAL',
        'IFCFIRESUPPRESSIONTERMINAL', 'IFCOUTLET', 'IFCFLOWCONTROLLER'
    ];

    const PSETS = [
        'Pset_WallCommon', 'Pset_SlabCommon', 'Pset_ColumnCommon', 'Pset_BeamCommon',
        'Pset_DoorCommon', 'Pset_WindowCommon', 'Pset_SpaceCommon',
        'Pset_DuctSegmentTypeCommon', 'Pset_PipeSegmentTypeCommon',
        'Pset_LightFixtureTypeCommon', 'Pset_SanitaryTerminalTypeCommon',
        'Qto_WallBaseQuantities', 'Qto_SlabBaseQuantities', 'Qto_SpaceBaseQuantities'
    ];

    const DATA_TYPES = [
        'IFCBOOLEAN', 'IFCLABEL', 'IFCTEXT', 'IFCIDENTIFIER',
        'IFCINTEGER', 'IFCREAL', 'IFCLENGTHMEASURE', 'IFCAREAMEASURE',
        'IFCVOLUMEMEASURE', 'IFCPRESSUREMEASURE', 'IFCPOWERMEASURE'
    ];

    // === STATE ===
    let currentMode = 'simplified';
    let selectedTemplates = [];
    let expertSpecs = [];
    let modalElement = null;

    // === CSS ===
    const css = `
        .ids-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10010; display: none; align-items: center; justify-content: center; }
        .ids-modal-overlay.visible { display: flex; }
        .ids-modal { background: #0f172a; border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 16px; width: 95%; max-width: 900px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; }
        .ids-modal-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(6, 182, 212, 0.05); }
        .ids-modal-header h2 { margin: 0; font-size: 1.1rem; color: #06b6d4; display: flex; align-items: center; gap: 8px; }
        .ids-modal-close { background: rgba(255,255,255,0.05); border: none; width: 32px; height: 32px; border-radius: 8px; color: #9ca3af; font-size: 1.2rem; cursor: pointer; }
        .ids-modal-close:hover { background: rgba(255,255,255,0.1); color: white; }
        .ids-modal-content { flex: 1; overflow-y: auto; padding: 20px; }
        .ids-modal-footer { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; gap: 12px; }
        .ids-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
        .ids-btn-secondary { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #9ca3af; }
        .ids-btn-secondary:hover { background: rgba(255,255,255,0.1); color: white; }
        .ids-btn-primary { background: linear-gradient(135deg, #06b6d4, #0891b2); border: none; color: white; }
        .ids-btn-primary:hover { box-shadow: 0 4px 20px rgba(6, 182, 212, 0.4); }
        .ids-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .ids-btn-small { padding: 6px 12px; font-size: 0.75rem; }
        .ids-btn-danger { background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }
        .ids-btn-success { background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; }

        .ids-mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .ids-mode-card { background: rgba(255,255,255,0.02); border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.2s; }
        .ids-mode-card:hover { border-color: rgba(6, 182, 212, 0.5); }
        .ids-mode-card.active { border-color: #06b6d4; background: rgba(6, 182, 212, 0.1); }
        .ids-mode-card .icon { font-size: 1.8rem; margin-bottom: 6px; }
        .ids-mode-card h3 { margin: 0 0 4px 0; color: #f3f4f6; font-size: 0.95rem; }
        .ids-mode-card p { margin: 0; color: #6b7280; font-size: 0.75rem; }

        .ids-section { margin-bottom: 20px; }
        .ids-section-title { font-size: 0.7rem; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .ids-category-title { font-size: 0.75rem; color: #94a3b8; margin: 12px 0 8px; font-weight: 600; }
        .ids-templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
        .ids-template-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        .ids-template-card:hover { border-color: rgba(6, 182, 212, 0.5); }
        .ids-template-card.selected { border-color: #06b6d4; background: rgba(6, 182, 212, 0.15); }
        .ids-template-card .icon { font-size: 1.2rem; }
        .ids-template-card .name { color: #e5e7eb; font-weight: 500; font-size: 0.75rem; }

        .ids-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .ids-form-row-3 { grid-template-columns: 1fr 1fr 1fr; }
        .ids-form-group { display: flex; flex-direction: column; gap: 3px; }
        .ids-form-group label { font-size: 0.7rem; color: #9ca3af; display: flex; align-items: center; gap: 4px; }
        .ids-form-group input, .ids-form-group select, .ids-form-group textarea { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 9px; color: white; font-size: 0.8rem; }
        .ids-form-group input:focus, .ids-form-group select:focus { outline: none; border-color: rgba(6, 182, 212, 0.5); }
        .ids-tooltip { display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; background: rgba(6, 182, 212, 0.2); border-radius: 50%; font-size: 0.55rem; color: #06b6d4; cursor: help; position: relative; }
        .ids-tooltip:hover::after { content: attr(data-tip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #1e293b; border: 1px solid rgba(6, 182, 212, 0.3); padding: 6px 10px; border-radius: 6px; font-size: 0.65rem; color: #e5e7eb; width: 180px; text-align: left; z-index: 100; margin-bottom: 4px; white-space: normal; }

        .ids-spec-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
        .ids-spec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .ids-spec-header h4 { margin: 0; color: #06b6d4; font-size: 0.85rem; }
        .ids-req-list { display: flex; flex-direction: column; gap: 6px; }
        .ids-req-item { background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; display: flex; justify-content: space-between; align-items: center; }
        .ids-req-item span { font-size: 0.75rem; color: #94a3b8; }
        .ids-req-badge { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; }
        .ids-req-badge.required { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .ids-req-badge.optional { background: rgba(234, 179, 8, 0.2); color: #facc15; }

        #ids-create-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: rgba(139, 92, 246, 0.1); border: 1px dashed rgba(139, 92, 246, 0.4); border-radius: 12px; color: #a78bfa; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
        #ids-create-btn:hover { background: rgba(139, 92, 246, 0.2); border-style: solid; }
        
        /* Bouton header IDS */
        #ids-header-help-btn { background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(14, 165, 233, 0.15)); border: 1px solid rgba(6, 182, 212, 0.3); padding: 6px 14px; border-radius: 20px; color: #22d3ee; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; white-space: nowrap; }
        #ids-header-help-btn:hover { background: linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(14, 165, 233, 0.25)); box-shadow: 0 2px 12px rgba(6, 182, 212, 0.3); }

        .ids-help-content { line-height: 1.7; color: #cbd5e1; font-size: 0.85rem; }
        .ids-help-content h3 { color: #06b6d4; margin: 20px 0 10px; font-size: 1.05rem; border-bottom: 1px solid rgba(6, 182, 212, 0.2); padding-bottom: 6px; }
        .ids-help-content h4 { color: #22d3ee; margin: 14px 0 8px; font-size: 0.95rem; }
        .ids-help-content p { margin: 10px 0; }
        .ids-help-content ul { margin: 10px 0; padding-left: 20px; }
        .ids-help-content li { margin: 6px 0; }
        .ids-help-content code { background: rgba(6, 182, 212, 0.15); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: #22d3ee; font-family: monospace; }
        .ids-help-content .highlight { background: rgba(6, 182, 212, 0.1); border-left: 3px solid #06b6d4; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 14px 0; }
        .ids-help-content .warning { background: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 14px 0; }
        .ids-help-content .success { background: rgba(34, 197, 94, 0.1); border-left: 3px solid #22c55e; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 14px 0; }
        .ids-help-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.75rem; }
        .ids-help-table th, .ids-help-table td { border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; text-align: left; }
        .ids-help-table th { background: rgba(6, 182, 212, 0.1); color: #22d3ee; font-weight: 600; }
        .ids-help-table tr:nth-child(even) { background: rgba(255,255,255,0.02); }
    `;

    function injectStyles() {
        if (document.getElementById('ids-creator-styles')) return;
        var style = document.createElement('style');
        style.id = 'ids-creator-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function tooltip(key) {
        return '<span class="ids-tooltip" data-tip="' + (TOOLTIPS[key] || '') + '">ℹ</span>';
    }

    function escapeXml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // === HELP MODAL ===
    function getHelpContent() {
        return `
        <div class="ids-help-content">
            <h3>📋 Qu'est-ce qu'une fiche IDS ?</h3>
            <p>L'<strong>IDS (Information Delivery Specification)</strong> est un standard international développé par <strong>buildingSMART</strong> et approuvé par l'<strong>ISO en juin 2024</strong>. C'est un fichier XML avec l'extension <code>.ids</code> qui permet de définir de manière précise et machine-readable les <strong>exigences d'information</strong> pour les modèles IFC.</p>
            
            <div class="highlight">
                <strong>🎯 Analogie :</strong> L'IDS est à la donnée BIM ce que le détecteur de métaux est au contrôle de sécurité d'un aéroport : il vérifie automatiquement la conformité en quelques secondes au lieu de plusieurs jours manuellement.
            </div>

            <h3>🔧 Pourquoi utiliser l'IDS ?</h3>
            <p>Avant l'IDS, les exigences d'information étaient définies dans des documents PDF ou Word, ce qui rendait la vérification manuelle, longue et sujette aux erreurs.</p>
            <ul>
                <li><strong>Définir des exigences précises</strong> - Plus d'ambiguïté sur les informations requises dans le modèle</li>
                <li><strong>Automatiser la validation</strong> - Vérification en quelques minutes au lieu de plusieurs jours</li>
                <li><strong>Réduire les erreurs</strong> - Taux de non-conformité passe de 30-40% à moins de 5%</li>
                <li><strong>Économiser du temps</strong> - ROI de 80-90% sur le temps d'audit</li>
                <li><strong>Améliorer la communication</strong> - Langage commun entre MOA, MOE et entreprises</li>
                <li><strong>Traçabilité</strong> - Historique des versions et conformité documentée</li>
            </ul>

            <div class="success">
                <strong>📊 Statistiques :</strong> Sur un projet moyen, l'audit manuel d'un modèle IFC prend 2-3 jours. Avec l'IDS, cette vérification prend moins de 5 minutes et est 100% reproductible.
            </div>

            <h3>📐 Structure d'un fichier IDS</h3>
            <p>Un fichier IDS contient des <strong>spécifications</strong>. Chaque spécification fonctionne sur le principe <code>SI → ALORS</code> :</p>
            
            <table class="ids-help-table">
                <tr><th>Partie</th><th>Description</th><th>Exemple concret</th></tr>
                <tr><td><strong>Applicabilité</strong><br/><em>(SI...)</em></td><td>Définit quels éléments IFC sont concernés par cette règle</td><td>SI l'élément est un <code>IfcWall</code> de type <code>SOLIDWALL</code></td></tr>
                <tr><td><strong>Exigences</strong><br/><em>(ALORS...)</em></td><td>Définit les informations que ces éléments doivent posséder</td><td>ALORS il doit avoir une classification CFC et un matériau</td></tr>
            </table>

            <h4>Exemple complet de spécification</h4>
            <div class="highlight">
                <strong>Règle "Murs porteurs"</strong><br/>
                <strong>SI</strong> l'élément est un <code>IfcWall</code> avec <code>PredefinedType = SOLIDWALL</code><br/>
                <strong>ALORS</strong> il doit avoir :<br/>
                • Un attribut <code>Name</code> non vide (obligatoire)<br/>
                • Une propriété <code>LoadBearing = true</code> dans <code>Pset_WallCommon</code><br/>
                • Une classification CFC au format <code>C21.XX</code><br/>
                • Un matériau assigné
            </div>

            <h3>📊 Les 6 facettes d'applicabilité</h3>
            <p>Pour cibler les éléments concernés par une règle, vous pouvez utiliser ces critères :</p>
            <table class="ids-help-table">
                <tr><th>Facette</th><th>Description</th><th>Exemple</th></tr>
                <tr><td><code>Entity</code></td><td>Classe IFC de l'élément</td><td><code>IFCWALL</code>, <code>IFCSLAB</code>, <code>IFCSPACE</code></td></tr>
                <tr><td><code>PredefinedType</code></td><td>Sous-type de l'entité</td><td><code>SOLIDWALL</code>, <code>PARTITIONING</code>, <code>FLOOR</code></td></tr>
                <tr><td><code>Classification</code></td><td>Code de classification existant</td><td>Éléments classifiés en <code>C21.*</code></td></tr>
                <tr><td><code>Attribute</code></td><td>Valeur d'un attribut IFC</td><td>Éléments avec <code>Name</code> contenant "EXT"</td></tr>
                <tr><td><code>Property</code></td><td>Valeur d'une propriété</td><td>Éléments avec <code>IsExternal = true</code></td></tr>
                <tr><td><code>Material</code></td><td>Matériau assigné</td><td>Éléments avec "Béton" comme matériau</td></tr>
            </table>

            <h3>📝 Les 5 types d'exigences</h3>
            <p>Une fois les éléments ciblés, vous pouvez exiger ces types d'informations :</p>
            <table class="ids-help-table">
                <tr><th>Type</th><th>Description</th><th>Exemples d'utilisation</th></tr>
                <tr><td><code>Attribute</code></td><td>Attribut natif IFC (Name, Description, Tag, ObjectType, etc.)</td><td>Exiger que <code>Name</code> suive un format de nomenclature</td></tr>
                <tr><td><code>Property</code></td><td>Propriété dans un PropertySet (Pset)</td><td>Exiger <code>Pset_WallCommon.LoadBearing</code> = true</td></tr>
                <tr><td><code>Classification</code></td><td>Code dans un système de classification</td><td>Exiger un code CFC, Uniclass ou OmniClass</td></tr>
                <tr><td><code>Material</code></td><td>Matériau ou couche de matériaux</td><td>Exiger qu'un mur ait un matériau défini</td></tr>
                <tr><td><code>PartOf</code></td><td>Relation de décomposition spatiale</td><td>Exiger qu'un élément soit dans un étage (IfcBuildingStorey)</td></tr>
            </table>

            <h3>🎚️ Cardinalité des exigences</h3>
            <p>Chaque exigence a une <strong>cardinalité</strong> qui définit son caractère obligatoire :</p>
            <table class="ids-help-table">
                <tr><th>Valeur</th><th>Signification</th><th>Résultat d'audit</th></tr>
                <tr><td><code>required</code></td><td>L'information est <strong>obligatoire</strong>. Son absence = échec.</td><td>❌ FAIL si manquant ou invalide</td></tr>
                <tr><td><code>optional</code></td><td>Si présente, elle doit respecter le format spécifié.</td><td>⚠️ FAIL si présent mais invalide, ✅ OK si absent</td></tr>
                <tr><td><code>prohibited</code></td><td>L'information est <strong>interdite</strong>. Sa présence = échec.</td><td>❌ FAIL si présent</td></tr>
            </table>
            
            <div class="warning">
                <strong>⚠️ Attention :</strong> La cardinalité <code>optional</code> ne signifie pas "l'information est facultative". Elle signifie "si elle existe, elle doit être valide". Pour une vraie exigence facultative, ne créez simplement pas d'exigence.
            </div>

            <h3>🔤 Expressions régulières (Regex)</h3>
            <p>Les regex permettent de valider le <strong>format</strong> des valeurs textuelles. C'est essentiel pour vérifier les nomenclatures, codes et identifiants.</p>
            
            <h4>Syntaxe de base</h4>
            <table class="ids-help-table">
                <tr><th>Symbole</th><th>Signification</th><th>Exemple</th></tr>
                <tr><td><code>[A-Z]</code></td><td>Une lettre majuscule (A à Z)</td><td><code>M</code>, <code>C</code>, <code>E</code></td></tr>
                <tr><td><code>[a-z]</code></td><td>Une lettre minuscule</td><td><code>a</code>, <code>b</code>, <code>z</code></td></tr>
                <tr><td><code>[0-9]</code></td><td>Un chiffre</td><td><code>0</code>, <code>5</code>, <code>9</code></td></tr>
                <tr><td><code>{n}</code></td><td>Exactement n répétitions</td><td><code>[0-9]{3}</code> = 3 chiffres</td></tr>
                <tr><td><code>{n,m}</code></td><td>Entre n et m répétitions</td><td><code>[0-9]{2,3}</code> = 2 ou 3 chiffres</td></tr>
                <tr><td><code>*</code></td><td>0 ou plusieurs répétitions</td><td><code>.*</code> = n'importe quoi</td></tr>
                <tr><td><code>+</code></td><td>1 ou plusieurs répétitions</td><td><code>[A-Z]+</code> = au moins une majuscule</td></tr>
                <tr><td><code>?</code></td><td>0 ou 1 occurrence</td><td><code>s?</code> = "s" optionnel</td></tr>
                <tr><td><code>(A|B)</code></td><td>A ou B</td><td><code>(REI|EI)</code> = REI ou EI</td></tr>
                <tr><td><code>\\.</code></td><td>Un point littéral</td><td><code>\\.</code> pour matcher "."</td></tr>
            </table>

            <h4>Exemples pratiques</h4>
            <table class="ids-help-table">
                <tr><th>Pattern</th><th>Description</th><th>Valeurs valides ✅</th><th>Valeurs invalides ❌</th></tr>
                <tr><td><code>[A-Z][0-9]{2}\\.[0-9]{2}</code></td><td>Code CFC Luxembourg</td><td>C21.03, E41.01</td><td>c21.03, C21-03</td></tr>
                <tr><td><code>(REI|EI|R|E|I)[0-9]{2,3}</code></td><td>Résistance au feu</td><td>REI60, EI120, R30</td><td>RF60, re120</td></tr>
                <tr><td><code>MUR-[0-9]{3}-[A-Z]{2}</code></td><td>Nomenclature mur</td><td>MUR-001-EX, MUR-042-IN</td><td>MUR-1-EX, mur-001</td></tr>
                <tr><td><code>STR-[A-Z]{3}-[0-9]+</code></td><td>Code structure</td><td>STR-BET-1, STR-MET-42</td><td>STR-BE-1</td></tr>
                <tr><td><code>.*porteur.*</code></td><td>Contient "porteur"</td><td>Mur porteur, porteur ext</td><td>Mur facade</td></tr>
            </table>

            <h3>🏗️ PropertySets standards (Pset)</h3>
            <p>Les PropertySets (Pset) sont des conteneurs de propriétés normalisés par buildingSMART :</p>
            <table class="ids-help-table">
                <tr><th>Pset</th><th>Entités</th><th>Propriétés courantes</th></tr>
                <tr><td><code>Pset_WallCommon</code></td><td>IfcWall</td><td>LoadBearing, IsExternal, FireRating, Status</td></tr>
                <tr><td><code>Pset_SlabCommon</code></td><td>IfcSlab</td><td>LoadBearing, IsExternal, Status</td></tr>
                <tr><td><code>Pset_DoorCommon</code></td><td>IfcDoor</td><td>FireRating, IsExternal, SecurityRating</td></tr>
                <tr><td><code>Pset_WindowCommon</code></td><td>IfcWindow</td><td>ThermalTransmittance, IsExternal</td></tr>
                <tr><td><code>Pset_SpaceCommon</code></td><td>IfcSpace</td><td>Category, NetPlannedArea, OccupancyType</td></tr>
                <tr><td><code>Qto_*BaseQuantities</code></td><td>Tous</td><td>NetArea, GrossVolume, Length, Width</td></tr>
            </table>

            <h3>📁 Versions IFC supportées</h3>
            <table class="ids-help-table">
                <tr><th>Version</th><th>Usage</th><th>Particularités</th></tr>
                <tr><td><code>IFC2X3</code></td><td>~70% des projets actuels</td><td>Standard le plus répandu, largement supporté</td></tr>
                <tr><td><code>IFC4</code></td><td>Standard ISO 16739</td><td>Plus complet, meilleure géométrie, nouveaux types</td></tr>
                <tr><td><code>IFC4X3</code></td><td>Infrastructure</td><td>Routes, ponts, tunnels, rails, alignements</td></tr>
            </table>

            <div class="warning">
                <strong>⚠️ Différences IFC2X3 vs IFC4 :</strong><br/>
                • <code>IfcWallStandardCase</code> (IFC2X3) → <code>IfcWall</code> (IFC4)<br/>
                • <code>PredefinedType PARTITIONING</code> n'existe pas en IFC2X3<br/>
                • Certains Psets diffèrent entre versions
            </div>

            <h3>🇱🇺 Référentiel GID Luxembourg</h3>
            <p>Le <strong>GID (Guide d'Interopérabilité Données)</strong> est le référentiel luxembourgeois pour les exigences BIM. Nos templates sont basés sur ce standard :</p>
            <ul>
                <li><strong>Classification CFC :</strong> Système de classification obligatoire au Luxembourg</li>
                <li><strong>Phases projet :</strong> APS → APD/AUT → PDE/SOU → EXE/ASB → EXP</li>
                <li><strong>Exigences par phase :</strong> Les informations requises augmentent avec l'avancement</li>
            </ul>

            <h3>🔄 Workflow d'utilisation</h3>
            <ol>
                <li><strong>Créer ou télécharger</strong> un fichier IDS correspondant aux exigences du projet</li>
                <li><strong>Charger le fichier IFC</strong> à vérifier dans le viewer</li>
                <li><strong>Charger le fichier IDS</strong> dans l'onglet Audit IDS</li>
                <li><strong>Lancer l'audit</strong> et analyser les résultats</li>
                <li><strong>Corriger les non-conformités</strong> dans le logiciel de modélisation</li>
                <li><strong>Ré-auditer</strong> jusqu'à conformité complète</li>
            </ol>

            <div class="success">
                <strong>💡 Conseil :</strong> Commencez par le <strong>Mode Simplifié</strong> avec les templates GID Luxembourg prêts à l'emploi. Une fois familiarisé, passez au <strong>Mode Expert</strong> pour créer des règles 100% personnalisées.
            </div>
        </div>
        `;
    }

    function openHelpModal() {
        var helpModal = document.getElementById('ids-help-modal');
        if (!helpModal) {
            helpModal = document.createElement('div');
            helpModal.className = 'ids-modal-overlay';
            helpModal.id = 'ids-help-modal';
            helpModal.innerHTML = '<div class="ids-modal" style="max-width:800px;max-height:95vh;"><div class="ids-modal-header"><h2>📚 Fonctionnement de l\'Audit IDS</h2><button class="ids-modal-close" onclick="document.getElementById(\'ids-help-modal\').classList.remove(\'visible\')">×</button></div><div class="ids-modal-content" style="max-height:calc(95vh - 130px);overflow-y:auto;">' + getHelpContent() + '</div><div class="ids-modal-footer"><button class="ids-btn ids-btn-primary" onclick="document.getElementById(\'ids-help-modal\').classList.remove(\'visible\')">Compris !</button></div></div>';
            document.body.appendChild(helpModal);
            helpModal.onclick = function (e) { if (e.target === helpModal) helpModal.classList.remove('visible'); };
        }
        helpModal.classList.add('visible');
    }

    // === HEADER BUTTON INJECTION ===
    function injectHeaderHelpButton() {
        if (document.getElementById('ids-header-help-btn')) return;

        // Chercher le bouton Audit Flash dans le header
        var auditFlashBtn = null;
        var allButtons = document.querySelectorAll('button');
        for (var i = 0; i < allButtons.length; i++) {
            if (allButtons[i].textContent.includes('Audit Flash') && allButtons[i].textContent.includes('Points')) {
                auditFlashBtn = allButtons[i];
                break;
            }
        }

        if (!auditFlashBtn) return;

        // Créer le bouton IDS
        var btn = document.createElement('button');
        btn.id = 'ids-header-help-btn';
        btn.innerHTML = '📚 Fonctionnement de l\'Audit IDS';
        btn.onclick = openHelpModal;

        // Insérer après le bouton Audit Flash
        auditFlashBtn.parentNode.insertBefore(btn, auditFlashBtn.nextSibling);
    }

    // === EXPERT MODE ===
    function addExpertSpec() {
        expertSpecs.push({
            name: 'SPEC-' + (expertSpecs.length + 1).toString().padStart(3, '0'),
            entity: 'IFCWALL',
            predefinedType: '',
            requirements: []
        });
        renderContent();
    }

    function removeExpertSpec(index) {
        expertSpecs.splice(index, 1);
        renderContent();
    }

    function addRequirementToSpec(specIndex, type) {
        var req = { type: type, cardinality: 'required' };
        if (type === 'attribute') {
            req.name = 'Name';
        } else if (type === 'property') {
            req.pset = 'Pset_WallCommon';
            req.name = 'Status';
            req.dataType = 'IFCLABEL';
        } else if (type === 'classification') {
            req.system = 'CFC';
            req.pattern = '';
        } else if (type === 'material') {
            // No extra fields needed
        }
        expertSpecs[specIndex].requirements.push(req);
        renderContent();
    }

    function removeRequirement(specIndex, reqIndex) {
        expertSpecs[specIndex].requirements.splice(reqIndex, 1);
        renderContent();
    }

    function updateExpertSpec(specIndex, field, value) {
        expertSpecs[specIndex][field] = value;
    }

    function updateExpertReq(specIndex, reqIndex, field, value) {
        expertSpecs[specIndex].requirements[reqIndex][field] = value;
    }

    function renderExpertMode() {
        var html = '<div class="ids-section">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
        html += '<div class="ids-section-title">🔧 Spécifications personnalisées</div>';
        html += '<button class="ids-btn ids-btn-success ids-btn-small" onclick="window.idsAddSpec()">+ Ajouter une spécification</button>';
        html += '</div>';

        if (expertSpecs.length === 0) {
            html += '<p style="color:#6b7280;font-size:0.8rem;text-align:center;padding:20px;">Cliquez sur "+ Ajouter une spécification" pour commencer</p>';
        }

        expertSpecs.forEach(function (spec, si) {
            html += '<div class="ids-spec-card">';
            html += '<div class="ids-spec-header">';
            html += '<h4>📋 Spécification #' + (si + 1) + '</h4>';
            html += '<button class="ids-btn ids-btn-danger ids-btn-small" onclick="window.idsRemoveSpec(' + si + ')">Supprimer</button>';
            html += '</div>';

            html += '<div class="ids-form-row ids-form-row-3">';
            html += '<div class="ids-form-group"><label>Nom ' + tooltip('specName') + '</label><input type="text" value="' + spec.name + '" onchange="window.idsUpdateSpec(' + si + ',\'name\',this.value)"></div>';
            html += '<div class="ids-form-group"><label>Entité IFC ' + tooltip('entity') + '</label><select onchange="window.idsUpdateSpec(' + si + ',\'entity\',this.value)">';
            IFC_ENTITIES.forEach(function (e) { html += '<option value="' + e + '"' + (spec.entity === e ? ' selected' : '') + '>' + e + '</option>'; });
            html += '</select></div>';
            html += '<div class="ids-form-group"><label>PredefinedType ' + tooltip('predefinedType') + '</label><input type="text" value="' + (spec.predefinedType || '') + '" placeholder="Ex: SOLIDWALL" onchange="window.idsUpdateSpec(' + si + ',\'predefinedType\',this.value)"></div>';
            html += '</div>';

            html += '<div class="ids-section-title" style="margin-top:12px;">Exigences</div>';
            html += '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">';
            html += '<button class="ids-btn ids-btn-small ids-btn-secondary" onclick="window.idsAddReq(' + si + ',\'attribute\')">+ Attribut</button>';
            html += '<button class="ids-btn ids-btn-small ids-btn-secondary" onclick="window.idsAddReq(' + si + ',\'property\')">+ Propriété</button>';
            html += '<button class="ids-btn ids-btn-small ids-btn-secondary" onclick="window.idsAddReq(' + si + ',\'classification\')">+ Classification</button>';
            html += '<button class="ids-btn ids-btn-small ids-btn-secondary" onclick="window.idsAddReq(' + si + ',\'material\')">+ Matériau</button>';
            html += '</div>';

            if (spec.requirements.length === 0) {
                html += '<p style="color:#6b7280;font-size:0.75rem;">Aucune exigence. Ajoutez-en ci-dessus.</p>';
            }

            spec.requirements.forEach(function (req, ri) {
                html += '<div class="ids-req-item">';
                html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
                html += '<span class="ids-req-badge ' + req.cardinality + '">' + req.type.toUpperCase() + '</span>';

                if (req.type === 'attribute') {
                    html += '<input type="text" style="width:120px;padding:4px 6px;font-size:0.7rem;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:white;" value="' + req.name + '" placeholder="Attribut" onchange="window.idsUpdateReq(' + si + ',' + ri + ',\'name\',this.value)">';
                } else if (req.type === 'property') {
                    html += '<select style="padding:4px;font-size:0.7rem;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:white;" onchange="window.idsUpdateReq(' + si + ',' + ri + ',\'pset\',this.value)">';
                    PSETS.forEach(function (p) { html += '<option value="' + p + '"' + (req.pset === p ? ' selected' : '') + '>' + p + '</option>'; });
                    html += '</select>';
                    html += '<input type="text" style="width:100px;padding:4px 6px;font-size:0.7rem;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:white;" value="' + req.name + '" placeholder="Propriété" onchange="window.idsUpdateReq(' + si + ',' + ri + ',\'name\',this.value)">';
                } else if (req.type === 'classification') {
                    html += '<input type="text" style="width:60px;padding:4px 6px;font-size:0.7rem;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:white;" value="' + req.system + '" placeholder="Système" onchange="window.idsUpdateReq(' + si + ',' + ri + ',\'system\',this.value)">';
                    html += '<input type="text" style="width:120px;padding:4px 6px;font-size:0.7rem;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:white;" value="' + (req.pattern || '') + '" placeholder="Pattern regex" onchange="window.idsUpdateReq(' + si + ',' + ri + ',\'pattern\',this.value)">';
                } else if (req.type === 'material') {
                    html += '<span style="color:#94a3b8;font-size:0.7rem;">Matériau requis</span>';
                }

                html += '<select style="padding:4px;font-size:0.65rem;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:white;" onchange="window.idsUpdateReq(' + si + ',' + ri + ',\'cardinality\',this.value)">';
                html += '<option value="required"' + (req.cardinality === 'required' ? ' selected' : '') + '>Obligatoire</option>';
                html += '<option value="optional"' + (req.cardinality === 'optional' ? ' selected' : '') + '>Optionnel</option>';
                html += '<option value="prohibited"' + (req.cardinality === 'prohibited' ? ' selected' : '') + '>Interdit</option>';
                html += '</select>';

                html += '</div>';
                html += '<button style="background:none;border:none;color:#f87171;cursor:pointer;font-size:0.9rem;" onclick="window.idsRemoveReq(' + si + ',' + ri + ')">✕</button>';
                html += '</div>';
            });

            html += '</div>';
        });

        html += '</div>';
        return html;
    }

    // === XML GENERATION ===
    function generateXml(data) {
        var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<ids:ids xmlns:ids="http://standards.buildingsmart.org/IDS" xmlns:xs="http://www.w3.org/2001/XMLSchema">\n';
        xml += '  <ids:info>\n';
        xml += '    <ids:title>' + escapeXml(data.title) + '</ids:title>\n';
        xml += '    <ids:version>1.0</ids:version>\n';
        xml += '    <ids:author>' + escapeXml(data.author) + '</ids:author>\n';
        xml += '    <ids:date>' + new Date().toISOString().split('T')[0] + '</ids:date>\n';
        xml += '  </ids:info>\n';
        xml += '  <ids:specifications>\n';

        data.specifications.forEach(function (spec) {
            xml += '    <ids:specification name="' + escapeXml(spec.name) + '" ifcVersion="' + data.ifcVersion + '">\n';
            xml += '      <ids:applicability minOccurs="0" maxOccurs="unbounded">\n';
            xml += '        <ids:entity>\n';
            xml += '          <ids:name><ids:simpleValue>' + spec.entity + '</ids:simpleValue></ids:name>\n';
            if (spec.predefinedType) {
                xml += '          <ids:predefinedType><ids:simpleValue>' + spec.predefinedType + '</ids:simpleValue></ids:predefinedType>\n';
            }
            xml += '        </ids:entity>\n';
            xml += '      </ids:applicability>\n';
            xml += '      <ids:requirements>\n';

            spec.requirements.forEach(function (req) {
                if (req.type === 'attribute') {
                    xml += '        <ids:attribute cardinality="' + req.cardinality + '">\n';
                    xml += '          <ids:name><ids:simpleValue>' + req.name + '</ids:simpleValue></ids:name>\n';
                    xml += '        </ids:attribute>\n';
                } else if (req.type === 'property') {
                    xml += '        <ids:property cardinality="' + req.cardinality + '"' + (req.dataType ? ' dataType="' + req.dataType + '"' : '') + '>\n';
                    xml += '          <ids:propertySet><ids:simpleValue>' + req.pset + '</ids:simpleValue></ids:propertySet>\n';
                    xml += '          <ids:baseName><ids:simpleValue>' + req.name + '</ids:simpleValue></ids:baseName>\n';
                    if (req.enumValues) {
                        xml += '          <ids:value><xs:restriction base="xs:string">\n';
                        req.enumValues.forEach(function (v) { xml += '            <xs:enumeration value="' + v + '"/>\n'; });
                        xml += '          </xs:restriction></ids:value>\n';
                    }
                    xml += '        </ids:property>\n';
                } else if (req.type === 'classification') {
                    xml += '        <ids:classification cardinality="' + req.cardinality + '">\n';
                    xml += '          <ids:system><ids:simpleValue>' + req.system + '</ids:simpleValue></ids:system>\n';
                    if (req.pattern) {
                        xml += '          <ids:value><xs:restriction base="xs:string"><xs:pattern value="' + escapeXml(req.pattern) + '"/></xs:restriction></ids:value>\n';
                    }
                    xml += '        </ids:classification>\n';
                } else if (req.type === 'material') {
                    xml += '        <ids:material cardinality="' + req.cardinality + '">\n';
                    xml += '          <ids:value><xs:restriction base="xs:string"><xs:minLength value="1"/></xs:restriction></ids:value>\n';
                    xml += '        </ids:material>\n';
                }
            });

            xml += '      </ids:requirements>\n';
            xml += '    </ids:specification>\n';
        });

        xml += '  </ids:specifications>\n';
        xml += '</ids:ids>';
        return xml;
    }

    function downloadFile(content, filename) {
        var blob = new Blob([content], { type: 'application/xml' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // === MODAL ===
    function createModal() {
        if (document.getElementById('ids-creator-modal')) return;

        var modal = document.createElement('div');
        modal.className = 'ids-modal-overlay';
        modal.id = 'ids-creator-modal';
        modal.innerHTML = '<div class="ids-modal"><div class="ids-modal-header"><h2>📝 Créer une Fiche IDS</h2><button class="ids-modal-close" id="ids-close-btn">×</button></div><div class="ids-modal-content" id="ids-content"></div><div class="ids-modal-footer"><button class="ids-btn ids-btn-secondary" id="ids-cancel-btn">Annuler</button><button class="ids-btn ids-btn-primary" id="ids-generate-btn" disabled>Générer l\'IDS ▶</button></div></div>';
        document.body.appendChild(modal);
        modalElement = modal;

        document.getElementById('ids-close-btn').onclick = closeModal;
        document.getElementById('ids-cancel-btn').onclick = closeModal;
        document.getElementById('ids-generate-btn').onclick = generateAndDownload;
        modal.onclick = function (e) { if (e.target === modal) closeModal(); };

        renderContent();
    }

    function openModal() {
        createModal();
        modalElement.classList.add('visible');
        selectedTemplates = [];
        expertSpecs = [];
        renderContent();
    }

    function closeModal() {
        if (modalElement) modalElement.classList.remove('visible');
    }

    function renderContent() {
        var content = document.getElementById('ids-content');
        if (!content) return;

        var html = '<div class="ids-section"><div class="ids-section-title">Choisir un mode</div>';
        html += '<div class="ids-mode-grid">';
        html += '<div class="ids-mode-card ' + (currentMode === 'simplified' ? 'active' : '') + '" data-mode="simplified"><div class="icon">📋</div><h3>Mode Simplifié</h3><p>Templates GID Luxembourg prêts à l\'emploi</p></div>';
        html += '<div class="ids-mode-card ' + (currentMode === 'expert' ? 'active' : '') + '" data-mode="expert"><div class="icon">🔧</div><h3>Mode Expert</h3><p>Création avancée avec contrôle total</p></div>';
        html += '</div></div>';

        if (currentMode === 'simplified') {
            html += '<div class="ids-section">';
            html += '<div class="ids-category-title">🏗️ Structure (GID Luxembourg)</div>';
            html += '<div class="ids-templates-grid">';
            TEMPLATES_STRUCTURE.forEach(function (t) {
                html += '<div class="ids-template-card ' + (selectedTemplates.includes(t.id) ? 'selected' : '') + '" data-id="' + t.id + '"><span class="icon">' + t.icon + '</span><span class="name">' + t.name + '</span></div>';
            });
            html += '</div>';
            html += '<div class="ids-category-title">⚡ Techniques Spéciales (MEP)</div>';
            html += '<div class="ids-templates-grid">';
            TEMPLATES_MEP.forEach(function (t) {
                html += '<div class="ids-template-card ' + (selectedTemplates.includes(t.id) ? 'selected' : '') + '" data-id="' + t.id + '"><span class="icon">' + t.icon + '</span><span class="name">' + t.name + '</span></div>';
            });
            html += '</div></div>';
        } else {
            html += renderExpertMode();
        }

        html += '<div class="ids-section"><div class="ids-section-title">📝 Métadonnées</div>';
        html += '<div class="ids-form-row">';
        html += '<div class="ids-form-group"><label>Titre ' + tooltip('title') + '</label><input type="text" id="ids-title" placeholder="Ex: Exigences Structure - Phase APD"></div>';
        html += '<div class="ids-form-group"><label>Auteur ' + tooltip('author') + '</label><input type="text" id="ids-author" placeholder="contact@bimsmarter.eu"></div>';
        html += '</div>';
        html += '<div class="ids-form-row">';
        html += '<div class="ids-form-group"><label>Phase ' + tooltip('phase') + '</label><select id="ids-phase"><option value="APS">APS</option><option value="APD" selected>APD/AUT</option><option value="PDE">PDE/SOU</option><option value="EXE">EXE/ASB</option><option value="EXP">EXP</option></select></div>';
        html += '<div class="ids-form-group"><label>Version IFC ' + tooltip('ifcVersion') + '</label><select id="ids-ifc-version"><option value="IFC2X3" selected>IFC2X3</option><option value="IFC4">IFC4</option></select></div>';
        html += '</div></div>';

        content.innerHTML = html;

        // Attach event handlers
        content.querySelectorAll('.ids-mode-card').forEach(function (card) {
            card.onclick = function () {
                currentMode = card.dataset.mode;
                renderContent();
            };
        });

        content.querySelectorAll('.ids-template-card').forEach(function (card) {
            card.onclick = function () {
                card.classList.toggle('selected');
                var id = card.dataset.id;
                if (selectedTemplates.includes(id)) {
                    selectedTemplates = selectedTemplates.filter(function (t) { return t !== id; });
                } else {
                    selectedTemplates.push(id);
                }
                updateGenerateButton();
            };
        });

        var titleInput = document.getElementById('ids-title');
        if (titleInput) {
            titleInput.oninput = updateGenerateButton;
        }

        updateGenerateButton();
    }

    function updateGenerateButton() {
        var btn = document.getElementById('ids-generate-btn');
        var titleInput = document.getElementById('ids-title');
        if (!btn) return;
        var hasSpecs = currentMode === 'simplified' ? selectedTemplates.length > 0 : expertSpecs.length > 0;
        btn.disabled = !(hasSpecs && titleInput && titleInput.value.trim());
    }

    function generateAndDownload() {
        var title = document.getElementById('ids-title').value.trim();
        var author = document.getElementById('ids-author').value.trim() || 'BIMsmarter.eu';
        var ifcVersion = document.getElementById('ids-ifc-version').value;
        var phase = document.getElementById('ids-phase').value;

        var specs;
        if (currentMode === 'simplified') {
            specs = selectedTemplates.map(function (tid) {
                var template = TEMPLATES.find(function (t) { return t.id === tid; });
                return {
                    name: template.name.toUpperCase().replace(/ /g, '-') + '-' + phase,
                    entity: template.entity,
                    predefinedType: template.predefinedType,
                    requirements: template.requirements
                };
            });
        } else {
            specs = expertSpecs;
        }

        var data = { title: title, author: author, ifcVersion: ifcVersion, specifications: specs };
        var xml = generateXml(data);
        var filename = title.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.ids';
        downloadFile(xml, filename);
        closeModal();
    }

    // === INJECTION ===
    function injectButton() {
        if (document.getElementById('ids-create-btn')) return;

        var downloadBtn = document.querySelector('a[href*="bimids.eu"]');
        if (!downloadBtn) {
            var allLinks = document.querySelectorAll('a');
            for (var i = 0; i < allLinks.length; i++) {
                if (allLinks[i].textContent.includes('Télécharger les fiches IDS')) {
                    downloadBtn = allLinks[i];
                    break;
                }
            }
        }
        if (!downloadBtn) return;

        var container = downloadBtn.closest('div');
        if (!container) return;

        var btn = document.createElement('button');
        btn.id = 'ids-create-btn';
        btn.innerHTML = '✨ Créer une fiche IDS personnalisée';
        btn.onclick = openModal;

        var uploadZone = document.querySelector('[class*="border-dashed"]');
        if (uploadZone) {
            uploadZone.parentNode.insertBefore(btn, uploadZone);
        } else {
            container.parentNode.insertBefore(btn, container.nextSibling);
        }
    }

    function startObserver() {
        var observer = new MutationObserver(function () {
            if (!document.getElementById('ids-create-btn')) {
                injectButton();
            }
            if (!document.getElementById('ids-header-help-btn')) {
                injectHeaderHelpButton();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // === GLOBAL FUNCTIONS ===
    window.idsOpenHelp = openHelpModal;
    window.idsAddSpec = addExpertSpec;
    window.idsRemoveSpec = removeExpertSpec;
    window.idsAddReq = addRequirementToSpec;
    window.idsRemoveReq = removeRequirement;
    window.idsUpdateSpec = updateExpertSpec;
    window.idsUpdateReq = updateExpertReq;

    function init() {
        injectStyles();
        setTimeout(function () {
            injectButton();
            injectHeaderHelpButton();
        }, 1000);
        startObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
