import type { Command, Device } from "../types";

function commandUpdatedAt(command: Command): string {
  return command.completedAt ?? command.acknowledgedAt ?? command.createdAt;
}

export function mergeCommand(commands: Command[], incoming: Command): Command[] {
  const previous = commands.find((command) => command.commandId === incoming.commandId);
  if (previous && (
    (previous.status !== "PENDING" && incoming.status === "PENDING") ||
    Date.parse(commandUpdatedAt(incoming)) < Date.parse(commandUpdatedAt(previous))
  )) {
    return commands;
  }
  const next = previous
    ? commands.map((command) => command.commandId === incoming.commandId ? incoming : command)
    : [incoming, ...commands];
  return next.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)).slice(0, 50);
}

export function applyCommandStatus(device: Device, command: Command): Device {
  if (device.deviceId !== command.deviceId) return device;

  const previous = device.currentState.lastCommand;
  const previousTime = previous?.updatedAt ? Date.parse(previous.updatedAt) : 0;
  const commandTime = Date.parse(command.createdAt);
  if (previous?.commandId !== command.commandId && Number.isFinite(commandTime) && commandTime < previousTime) {
    return device;
  }
  if (previous?.commandId === command.commandId && (
    (previous.status !== "PENDING" && command.status === "PENDING") ||
    Date.parse(commandUpdatedAt(command)) < previousTime
  )) {
    return device;
  }

  return {
    ...device,
    currentState: {
      ...device.currentState,
      lastCommand: {
        commandId: command.commandId,
        status: command.status,
        updatedAt: commandUpdatedAt(command)
      }
    }
  };
}
