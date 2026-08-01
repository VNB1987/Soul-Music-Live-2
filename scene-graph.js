"use strict";

/*
  SOUL MUSIC SCENE GRAPH — ETAPA 0

  Sursa unică de adevăr pentru structura scenei 1920 × 1080.
  Modulul nu desenează și nu schimbă designul existent. El descrie,
  validează și expune toate straturile pentru modulele următoare.
*/

const SoulSceneGraph = {
  version: "0.1.0-stage0",

  width: 1920,
  height: 1080,

  rootId: "stage",
  ready: false,

  nodes: new Map(),
  errors: [],
  warnings: [],

  definitions: [
    {
      id: "stage",
      domId: "stage",
      label: "Scena principală",
      type: "root",
      layer: 0,
      bounds: {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080
      },
      tags: ["root", "viewport"]
    },
    {
      id: "backgroundGroup",
      label: "Fundal",
      type: "group",
      parentId: "stage",
      layer: 1,
      tags: ["group", "background"]
    },
    {
      id: "ambientCanvas",
      domId: "ambientCanvas",
      label: "Ambient",
      type: "canvas",
      parentId: "backgroundGroup",
      layer: 1,
      reactive: true,
      tags: ["canvas", "ambient"]
    },
    {
      id: "visualizerCanvas",
      domId: "visualizerCanvas",
      label: "Vizualizator audio",
      type: "canvas",
      parentId: "backgroundGroup",
      layer: 7,
      reactive: true,
      tags: ["canvas", "audio", "visualizer"]
    },
    {
      id: "contentGroup",
      label: "Conținut principal",
      type: "group",
      parentId: "stage",
      layer: 8,
      tags: ["group", "content"]
    },
    {
      id: "leftFrame",
      domId: "leftFrame",
      label: "Fereastră verticală",
      type: "frame",
      parentId: "contentGroup",
      layer: 8,
      reactive: true,
      tags: ["frame", "media", "left"]
    },
    {
      id: "logoGroup",
      domId: "logoArea",
      label: "Logo Soul Music",
      type: "group",
      parentId: "contentGroup",
      layer: 10,
      reactive: true,
      tags: ["group", "brand", "logo"]
    },
    {
      id: "logoAmbientGlow",
      domId: "logoAmbientGlow",
      label: "Aură logo",
      type: "effect",
      parentId: "logoGroup",
      layer: 1,
      reactive: true,
      tags: ["effect", "glow", "music"]
    },
    {
      id: "logoAfterglow",
      domId: "logoAfterglow",
      label: "Ecou luminos logo",
      type: "effect",
      parentId: "logoGroup",
      layer: 2,
      reactive: true,
      tags: ["effect", "glow", "afterglow"]
    },
    {
      id: "logoVoiceGlow",
      domId: "logoVoiceGlow",
      label: "Aură voce",
      type: "effect",
      parentId: "logoGroup",
      layer: 3,
      reactive: true,
      tags: ["effect", "glow", "voice"]
    },
    {
      id: "soulLogo",
      domId: "soulLogo",
      label: "Siglă Soul Music",
      type: "image",
      parentId: "logoGroup",
      layer: 5,
      reactive: true,
      tags: ["image", "brand", "logo"]
    },
    {
      id: "tiktokButton",
      domId: "tiktokButton",
      label: "Buton TikTok",
      type: "badge",
      parentId: "contentGroup",
      layer: 11,
      reactive: true,
      tags: ["badge", "tiktok"]
    },
    {
      id: "liveButton",
      domId: "liveButton",
      label: "Indicator Live",
      type: "badge",
      parentId: "contentGroup",
      layer: 11,
      reactive: true,
      tags: ["badge", "live"]
    },
    {
      id: "cameraFrame",
      domId: "cameraFrame",
      label: "Camera live",
      type: "frame",
      parentId: "contentGroup",
      layer: 8,
      reactive: true,
      tags: ["frame", "camera", "right"]
    },
    {
      id: "effectsGroup",
      label: "Efecte",
      type: "group",
      parentId: "stage",
      layer: 12,
      tags: ["group", "effects"]
    },
    {
      id: "effectsCanvas",
      domId: "effectsCanvas",
      label: "Efecte reactive",
      type: "canvas",
      parentId: "effectsGroup",
      layer: 12,
      reactive: true,
      tags: ["canvas", "effects", "audio"]
    },
    {
      id: "hudGroup",
      label: "Interfață live",
      type: "group",
      parentId: "stage",
      layer: 16,
      tags: ["group", "hud"]
    },
    {
      id: "ticker",
      domId: "ticker",
      label: "Banner mesaje",
      type: "banner",
      parentId: "hudGroup",
      layer: 16,
      reactive: true,
      tags: ["banner", "ticker", "text"]
    }
  ],

  init() {
    if (this.ready) {
      return this.getState();
    }

    this.nodes.clear();
    this.errors = [];
    this.warnings = [];

    this.definitions.forEach(
      (definition, order) => {
        this.register({
          ...definition,
          order
        });
      }
    );

    this.resolveElements();
    this.syncBounds();
    this.validate();
    this.bindEvents();

    this.ready =
      this.errors.length === 0;

    document.body.dataset.sceneGraph =
      this.ready
        ? "ready"
        : "error";

    window.dispatchEvent(
      new CustomEvent(
        "soulmusic:scenegraphready",
        {
          detail: this.getState()
        }
      )
    );

    if (!this.ready) {
      console.error(
        "Soul Music Scene Graph:",
        this.errors
      );
    }

    return this.getState();
  },

  register(definition) {
    if (
      !definition.id ||
      this.nodes.has(definition.id)
    ) {
      this.errors.push(
        `Nod invalid sau duplicat: ${definition.id || "fără id"}`
      );

      return null;
    }

    const node = {
      id: definition.id,
      domId: definition.domId || null,
      label: definition.label || definition.id,
      type: definition.type || "element",
      parentId: definition.parentId || null,
      layer: Number(definition.layer || 0),
      order: Number(definition.order || 0),
      required: definition.required !== false,
      reactive: Boolean(definition.reactive),
      tags: [...(definition.tags || [])],
      bounds: definition.bounds
        ? { ...definition.bounds }
        : null,
      element: null,
      children: [],
      visible: true,
      enabled: true
    };

    this.nodes.set(node.id, node);

    return node;
  },

  resolveElements() {
    this.nodes.forEach(node => {
      if (!node.domId) {
        return;
      }

      node.element =
        document.getElementById(
          node.domId
        );
    });

    this.nodes.forEach(node => {
      if (!node.parentId) {
        return;
      }

      const parent =
        this.nodes.get(node.parentId);

      if (parent) {
        parent.children.push(node.id);
      }
    });
  },

  validate() {
    this.nodes.forEach(node => {
      if (
        node.parentId &&
        !this.nodes.has(node.parentId)
      ) {
        this.errors.push(
          `Părinte inexistent pentru ${node.id}: ${node.parentId}`
        );
      }

      if (
        node.domId &&
        node.required &&
        !node.element
      ) {
        this.errors.push(
          `Element DOM inexistent: #${node.domId}`
        );
      }
    });

    if (!this.nodes.has(this.rootId)) {
      this.errors.push(
        `Rădăcina ${this.rootId} lipsește.`
      );
    }

    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  },

  bindEvents() {
    window.addEventListener(
      "resize",
      () => this.requestSync()
    );

    window.addEventListener(
      "soulmusic:resume",
      () => this.requestSync()
    );

    window.addEventListener(
      "soulmusic:reset",
      () => this.reset()
    );
  },

  requestSync() {
    window.requestAnimationFrame(
      () => this.syncBounds()
    );
  },

  syncBounds() {
    const root =
      this.nodes.get(this.rootId);

    const rootRect =
      root?.element
        ?.getBoundingClientRect();

    if (
      !rootRect ||
      rootRect.width <= 0 ||
      rootRect.height <= 0
    ) {
      return;
    }

    const scaleX =
      this.width / rootRect.width;

    const scaleY =
      this.height / rootRect.height;

    this.nodes.forEach(node => {
      if (!node.element) {
        return;
      }

      const rect =
        node.element
          .getBoundingClientRect();

      node.bounds = {
        x:
          (rect.left - rootRect.left) *
          scaleX,
        y:
          (rect.top - rootRect.top) *
          scaleY,
        width:
          rect.width * scaleX,
        height:
          rect.height * scaleY
      };
    });
  },

  getNode(id) {
    return this.nodes.get(id) || null;
  },

  getChildren(id) {
    const node = this.getNode(id);

    if (!node) {
      return [];
    }

    return node.children
      .map(childId => this.getNode(childId))
      .filter(Boolean);
  },

  getNodesByTag(tag) {
    return [...this.nodes.values()]
      .filter(node => node.tags.includes(tag));
  },

  getRenderList() {
    return [...this.nodes.values()]
      .filter(node => node.element)
      .sort((first, second) => {
        if (first.layer !== second.layer) {
          return first.layer - second.layer;
        }

        return first.order - second.order;
      });
  },

  traverse(
    id = this.rootId,
    visitor = () => {}
  ) {
    const node = this.getNode(id);

    if (!node) {
      return;
    }

    visitor(node);

    node.children.forEach(
      childId => this.traverse(
        childId,
        visitor
      )
    );
  },

  setVisible(id, visible) {
    const node = this.getNode(id);

    if (!node) {
      return false;
    }

    node.visible = Boolean(visible);

    node.element?.classList.toggle(
      "scene-node-hidden",
      !node.visible
    );

    this.emitNodeChange(node);

    return true;
  },

  setEnabled(id, enabled) {
    const node = this.getNode(id);

    if (!node) {
      return false;
    }

    node.enabled = Boolean(enabled);

    if (node.element) {
      node.element.dataset.sceneEnabled =
        String(node.enabled);
    }

    this.emitNodeChange(node);

    return true;
  },

  emitNodeChange(node) {
    window.dispatchEvent(
      new CustomEvent(
        "soulmusic:scenegraphchange",
        {
          detail: {
            id: node.id,
            visible: node.visible,
            enabled: node.enabled
          }
        }
      )
    );
  },

  reset() {
    this.nodes.forEach(node => {
      node.visible = true;
      node.enabled = true;

      node.element?.classList.remove(
        "scene-node-hidden"
      );

      if (node.element) {
        node.element.dataset.sceneEnabled =
          "true";
      }
    });

    this.requestSync();
  },

  serializeNode(node) {
    return {
      id: node.id,
      domId: node.domId,
      label: node.label,
      type: node.type,
      parentId: node.parentId,
      children: [...node.children],
      layer: node.layer,
      reactive: node.reactive,
      visible: node.visible,
      enabled: node.enabled,
      tags: [...node.tags],
      bounds: node.bounds
        ? { ...node.bounds }
        : null
    };
  },

  getSnapshot() {
    return {
      version: this.version,
      rootId: this.rootId,
      width: this.width,
      height: this.height,
      nodes: [...this.nodes.values()]
        .map(node => this.serializeNode(node))
    };
  },

  getState() {
    return {
      version: this.version,
      ready: this.ready,
      nodeCount: this.nodes.size,
      renderNodeCount:
        this.getRenderList().length,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }
};

window.SoulSceneGraph =
  SoulSceneGraph;

window.addEventListener(
  "DOMContentLoaded",
  () => {
    SoulSceneGraph.init();
  }
);
