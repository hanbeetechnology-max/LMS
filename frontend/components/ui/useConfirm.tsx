"use client";

import { useCallback, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

type AskOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
};

type Pending = AskOptions & { resolve: (value: boolean) => void };

export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);

  const ask = useCallback(
    (options: AskOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  const settle = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      title={pending?.title ?? ""}
      message={pending?.message ?? ""}
      confirmLabel={pending?.confirmLabel ?? "Confirm"}
      tone={pending?.tone ?? "primary"}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { ask, dialog };
}
