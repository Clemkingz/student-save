import { test } from "node:test";
import { strict as assert } from "node:assert";
import { recoverFinance, saveFinance } from "./financeStorage";

class TestStorage {
  values = new Map<string, string>();
  failKey: string | null = null;
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failKey === key) {
      this.failKey = null;
      throw new Error("Quota exceeded");
    }
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

function withStorage(action: (storage: TestStorage) => void) {
  const storage = new TestStorage();
  const names = ["localStorage", "window", "StorageEvent"] as const;
  const descriptors = names.map((name) =>
    Object.getOwnPropertyDescriptor(globalThis, name),
  );
  class TestStorageEvent extends Event {
    constructor(type: string) {
      super(type);
    }
  }
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dispatchEvent() {} },
  });
  Object.defineProperty(globalThis, "StorageEvent", {
    configurable: true,
    value: TestStorageEvent,
  });
  try {
    action(storage);
  } finally {
    names.forEach((name, index) => {
      const descriptor = descriptors[index];
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
}

test("a failed multi-record write restores the previous ledger and savings state", () =>
  withStorage((storage) => {
    storage.setItem("ledger", '[{"amount":100}]');
    storage.setItem("goals", '[{"savedAmount":0}]');
    storage.failKey = "goals";
    assert.throws(() =>
      saveFinance("test", {
        ledger: [{ amount: 80 }],
        goals: [{ savedAmount: 20 }],
      }),
    );
    assert.equal(storage.getItem("ledger"), '[{"amount":100}]');
    assert.equal(storage.getItem("goals"), '[{"savedAmount":0}]');
    assert.equal(storage.getItem("studentsave:finance-pending:test"), null);
  }));

test("an interrupted write recovers all records before subsequent reads", () =>
  withStorage((storage) => {
    storage.setItem(
      "studentsave:finance-pending:test",
      JSON.stringify({
        ledger: '[{"amount":80}]',
        goals: '[{"savedAmount":20}]',
      }),
    );
    storage.setItem("ledger", '[{"amount":80}]');
    recoverFinance("test");
    assert.equal(storage.getItem("goals"), '[{"savedAmount":20}]');
    assert.equal(storage.getItem("studentsave:finance-pending:test"), null);
    recoverFinance("test");
    assert.equal(storage.getItem("ledger"), '[{"amount":80}]');
  }));
