import { NativeModule, registerWebModule } from 'expo-modules-core';

import { type ChangeEventPayload } from './LockState.types';

type LockStateModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
};

class LockStateModule extends NativeModule<LockStateModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

// expo-modules-core in SDK 53 requires the module name as a second argument;
// it must match the native Name("LockState") declared in the Swift/Kotlin
// modules.
export default registerWebModule(LockStateModule, 'LockState');
