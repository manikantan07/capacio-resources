import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import { Modal } from "./Modal";
import { useCreateProject } from "../features/queries";
import { useToast } from "./ToastProvider";
import { ApiError } from "../api/client";
import type { Project } from "../types";

const schema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  owner: z.string().optional(),
  tech: z.string().optional(),
  plannedStart: z.string().optional(),
  plannedEnd: z.string().optional(),
  state: z.enum(["Active", "Backlog", "Completed", "Tentative"]),
});

type FormValues = z.infer<typeof schema>;

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (project: Project) => void;
}

export function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const createProject = useCreateProject();
  const { showToast } = useToast();
  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", owner: "", tech: "", plannedStart: "", plannedEnd: "", state: "Active" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const created = await createProject.mutateAsync({
        name: values.name,
        owner: values.owner || null,
        description: values.tech || null,
        tech: values.tech || null,
        plannedStart: values.plannedStart || null,
        plannedEnd: values.plannedEnd || null,
        state: values.state,
      });
      showToast(`"${values.name}" created`);
      reset();
      onClose();
      onCreated?.(created);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not create project");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New project">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Project name" required autoFocus error={!!formState.errors.name} helperText={formState.errors.name?.message} />
          )}
        />
        <Controller name="owner" control={control} render={({ field }) => <TextField {...field} label="Owner" />} />
        <Controller name="tech" control={control} render={({ field }) => <TextField {...field} label="Description / tech" placeholder="e.g. React / API integration" />} />
        <div style={{ display: "flex", gap: 12 }}>
          <Controller name="plannedStart" control={control} render={({ field }) => <TextField {...field} label="Start date" type="date" slotProps={{ inputLabel: { shrink: true } }} fullWidth />} />
          <Controller name="plannedEnd" control={control} render={({ field }) => <TextField {...field} label="Target end date" type="date" slotProps={{ inputLabel: { shrink: true } }} fullWidth />} />
        </div>
        <Controller
          name="state"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="State"
              helperText={field.value === "Tentative" ? "Not confirmed yet — its work is shown but doesn't count toward capacity until you confirm it." : undefined}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Tentative">Tentative — not confirmed</MenuItem>
              <MenuItem value="Backlog">Backlog</MenuItem>
            </TextField>
          )}
        />
        <Button type="submit" variant="contained" disabled={!formState.isValid || createProject.isPending} sx={{ height: 38 }}>
          Create project
        </Button>
      </form>
    </Modal>
  );
}
