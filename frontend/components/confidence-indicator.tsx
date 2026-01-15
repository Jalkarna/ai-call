/**
 * Confidence Indicator Component
 * 
 * Visual indicator for AI extraction confidence scores.
 * Shows a progress bar with color coding based on confidence level.
 */

"use client";

import { cn } from "@/lib/utils";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

export interface ConfidenceIndicatorProps {
  /** Confidence value between 0 and 1 */
  confidence: number;
  /** Field name to display in tooltip */
  fieldName?: string;
  /** Whether to show the percentage text */
  showPercentage?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
}

export function ConfidenceIndicator({
  confidence,
  fieldName,
  showPercentage = true,
  size = "md",
  className,
}: ConfidenceIndicatorProps) {
  // Clamp confidence between 0 and 1
  const clampedConfidence = Math.max(0, Math.min(1, confidence));
  const percentage = Math.round(clampedConfidence * 100);

  // Determine color based on confidence level
  const getColor = () => {
    if (clampedConfidence >= 0.8) return "bg-green-500";
    if (clampedConfidence >= 0.6) return "bg-yellow-500";
    if (clampedConfidence >= 0.4) return "bg-orange-500";
    return "bg-red-500";
  };

  const getTextColor = () => {
    if (clampedConfidence >= 0.8) return "text-green-600";
    if (clampedConfidence >= 0.6) return "text-yellow-600";
    if (clampedConfidence >= 0.4) return "text-orange-600";
    return "text-red-600";
  };

  const getLabel = () => {
    if (clampedConfidence >= 0.8) return "High confidence";
    if (clampedConfidence >= 0.6) return "Medium confidence";
    if (clampedConfidence >= 0.4) return "Low confidence";
    return "Very low confidence";
  };

  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const tooltipContent = fieldName 
    ? `${fieldName}: ${percentage}% - ${getLabel()}`
    : `${percentage}% - ${getLabel()}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            <div className={cn(
              "flex-1 rounded-full bg-muted overflow-hidden min-w-[60px]",
              sizeClasses[size]
            )}>
              <div
                className={cn("h-full rounded-full transition-all", getColor())}
                style={{ width: `${percentage}%` }}
              />
            </div>
            {showPercentage && (
              <span className={cn("text-xs font-medium tabular-nums", getTextColor())}>
                {percentage}%
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Confidence Badge - Compact version for inline use
 */
export interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const percentage = Math.round(Math.max(0, Math.min(1, confidence)) * 100);

  const getVariant = () => {
    if (confidence >= 0.8) return "bg-green-100 text-green-700 border-green-200";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    if (confidence >= 0.4) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
      getVariant(),
      className
    )}>
      {percentage}%
    </span>
  );
}

/**
 * Field with Confidence - Combines field display with confidence indicator
 */
export interface FieldWithConfidenceProps {
  label: string;
  value: string;
  confidence: number;
  onEdit?: () => void;
  editable?: boolean;
  className?: string;
}

export function FieldWithConfidence({
  label,
  value,
  confidence,
  onEdit,
  editable = false,
  className,
}: FieldWithConfidenceProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <ConfidenceBadge confidence={confidence} />
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "flex-1 text-sm",
          confidence < 0.6 && "text-yellow-600"
        )}>
          {value}
        </span>
        {editable && onEdit && (
          <button
            onClick={onEdit}
            className="text-xs text-primary hover:underline"
          >
            Edit
          </button>
        )}
      </div>
      <ConfidenceIndicator 
        confidence={confidence} 
        showPercentage={false} 
        size="sm" 
      />
    </div>
  );
}
