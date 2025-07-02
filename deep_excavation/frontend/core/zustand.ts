// A tiny, manual implementation of zustand's create function.
// This is a simplified version for demonstration purposes and to avoid
// dependency issues during our development process.

type State = object;
type StateCreator<T extends State> = (
  set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
  get: () => T
) => T;

export function create<T extends State>(createState: StateCreator<T>) {
  let state: T;
  const listeners = new Set<(state: T) => void>();

  const setState = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    const nextPartial = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...nextPartial };
    listeners.forEach(listener => listener(state));
  };

  const getState = () => state;

  const subscribe = (listener: (state: T) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  state = createState(setState, getState);

  const useStore = (selector: (state: T) => any) => {
    // This is a placeholder for the real React hook integration.
    // In a real app, this would use React.useState and React.useEffect
    // to subscribe to the store and re-render the component on changes.
    // For our current manual setup, we assume components will re-render
    // through other means or that we'll manage this manually.
    return selector(state);
  };
  
  // A more complete hook would be needed for a real app, but this serves our purpose.
  // We'll manage re-renders at the top level for now.

  const useBoundStore = (selector: (state: T) => any) => useStore(selector);
  useBoundStore.getState = getState;
  
  return useBoundStore;
}

// This export makes the file a module, which is required by TypeScript's module system.
export {}; 