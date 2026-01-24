"use server";

import {
  type StrudelValidationResult,
  validateStrudel,
} from "~/services/strudelValidation";

export async function validateStrudelAction(
  code: string,
): Promise<StrudelValidationResult> {
  const source = typeof code === "string" ? code : "";
  console.log(source);
  return validateStrudel(source);
}
