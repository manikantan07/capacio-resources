import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { Modal } from "./Modal";
import { useCreatePerson } from "../features/queries";
import { useToast } from "./ToastProvider";
import { ApiError } from "../api/client";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  skills: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function AddMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createPerson = useCreatePerson();
  const { showToast } = useToast();
  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", skills: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createPerson.mutateAsync({ name: values.name, skills: values.skills });
      showToast(`${values.name} added to the team`);
      reset();
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not add member");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add member">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Name" required autoFocus error={!!formState.errors.name} helperText={formState.errors.name?.message} />
          )}
        />
        <Controller name="skills" control={control} render={({ field }) => <TextField {...field} label="Skills" placeholder="React, HTML, SEO" />} />
        <Button type="submit" variant="contained" disabled={!formState.isValid || createPerson.isPending} sx={{ height: 38 }}>
          Add member
        </Button>
      </form>
    </Modal>
  );
}
