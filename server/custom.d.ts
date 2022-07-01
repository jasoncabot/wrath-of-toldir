interface Bindings {
  MAP: DurableObjectNamespace;
  COMBAT: DurableObjectNamespace;
  CHARACTER: DurableObjectNamespace;
  ITEM: DurableObjectNamespace;
  FRONTEND_URI: string;

  dependencies: {
    randomiser: any
  }
}
