import { useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { Modal } from "./Modal";
import { useChangePassword } from "../features/queries";
import { useToast } from "./ToastProvider";
import { ApiError } from "../api/client";

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const changePassword = useChangePassword();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    setError(null);
  };

  const submit = async () => {
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords don't match");
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      showToast("Password changed");
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password");
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Change password"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <TextField
          label="Current password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoFocus
        />
        <TextField label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <TextField
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={!!error}
          helperText={error}
        />
        <Button
          variant="contained"
          onClick={submit}
          disabled={!currentPassword || !newPassword || !confirm || changePassword.isPending}
          sx={{ height: 38 }}
        >
          Save new password
        </Button>
      </div>
    </Modal>
  );
}
