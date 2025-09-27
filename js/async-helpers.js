/**
 * Helper functions for async operations in FPLTeamManager
 */

/**
 * Converts a method to an async method that properly handles promises
 * @param {Function} method The method to convert
 * @returns {Function} The async version of the method
 */
export function makeAsync(method) {
  return async function(...args) {
    try {
      const result = method.apply(this, args);
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    } catch (error) {
      console.error(`Error in async method:`, error);
      throw error;
    }
  };
}

/**
 * Patches an object's methods to be async
 * @param {Object} obj The object to patch
 * @param {string[]} methodNames The names of methods to make async
 */
export function patchAsyncMethods(obj, methodNames) {
  for (const methodName of methodNames) {
    const originalMethod = obj[methodName];
    if (typeof originalMethod === 'function') {
      obj[methodName] = makeAsync(originalMethod);
    }
  }
}

/**
 * Creates an async version of a class method
 * @param {Object} prototype The class prototype
 * @param {string} methodName The method name to make async
 */
export function makeMethodAsync(prototype, methodName) {
  const originalMethod = prototype[methodName];
  if (typeof originalMethod === 'function') {
    prototype[methodName] = async function(...args) {
      try {
        const result = originalMethod.apply(this, args);
        if (result instanceof Promise) {
          return await result;
        }
        return result;
      } catch (error) {
        console.error(`Error in ${methodName}:`, error);
        throw error;
      }
    };
  }
}
