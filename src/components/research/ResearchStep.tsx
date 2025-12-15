import type { ResearchStep as ResearchStepType } from "@/types/research";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { motion } from "framer-motion";

interface ResearchStepProps {
  step: ResearchStepType;
}

const stepIcons: Record<ResearchStepType["type"], string> = {
  understanding: "🔍",
  searching: "📚",
  synthesizing: "✨",
};

const statusColors: Record<
  ResearchStepType["status"],
  "default" | "primary" | "success" | "danger"
> = {
  pending: "default",
  in_progress: "primary",
  completed: "success",
  error: "danger",
};

export function ResearchStep({ step }: ResearchStepProps) {
  const isActive = step.status === "in_progress";

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`w-full ${isActive ? "border-primary border-2" : ""}`}
        shadow={isActive ? "lg" : "sm"}
      >
        <CardHeader className="flex gap-3 pb-0">
          <span className="text-xl">{stepIcons[step.type]}</span>
          <div className="flex flex-col flex-1">
            <p className="text-md font-semibold">{step.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {isActive && <Spinner size="sm" />}
            <Chip color={statusColors[step.status]} size="sm" variant="flat">
              {step.status === "in_progress" ? "In Progress" : step.status}
            </Chip>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          {step.content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-default-600 whitespace-pre-wrap leading-relaxed">
                {step.content}
                {isActive && <span className="animate-pulse">▊</span>}
              </p>
            </div>
          ) : isActive ? (
            <p className="text-default-400 italic">Processing...</p>
          ) : null}
        </CardBody>
      </Card>
    </motion.div>
  );
}
