// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import '@testing-library/jest-dom/vitest';

// Polyfill ResizeObserver for jsdom
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    cb: any;
    constructor(cb: any) {
      this.cb = cb;
    }
    observe(target: any) {
      if (typeof this.cb === 'function') {
        setTimeout(() => {
          this.cb([
            {
              target,
              contentRect: { width: 250, height: 100 },
              borderBoxSize: [{ inlineSize: 250, blockSize: 100 }],
            },
          ]);
        }, 0);
      }
    }
    unobserve() {}
    disconnect() {}
  } as any;
}

// Polyfill DOMMatrixReadOnly for jsdom
if (typeof global.DOMMatrixReadOnly === 'undefined') {
  global.DOMMatrixReadOnly = class DOMMatrixReadOnly {
    m11 = 1;
    m12 = 0;
    m21 = 0;
    m22 = 1;
    m41 = 0;
    m42 = 0;
  } as any;
}
