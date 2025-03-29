"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface ConversionSettings {
  outputFormat: "standard" | "github" | "academic" | "plain"
  extractImages: boolean
  inlineImages: boolean
  preserveFormatting: boolean
  includeMetadata: boolean
  useOCR: boolean
}

interface SettingsSectionProps {
  settings: ConversionSettings
  onChange: (settings: Partial<ConversionSettings>) => void
  disabled?: boolean
}

export default function SettingsSection({
  settings,
  onChange,
  disabled = false
}: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="output-format">Output Format</Label>
          <Select
            value={settings.outputFormat}
            onValueChange={value =>
              onChange({
                outputFormat: value as ConversionSettings["outputFormat"]
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id="output-format" className="w-[180px]">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="github">GitHub</SelectItem>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="plain">Plain Text</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="extract-images">Extract Images</Label>
          <Switch
            id="extract-images"
            checked={settings.extractImages}
            onCheckedChange={checked => onChange({ extractImages: checked })}
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="inline-images">Inline Images</Label>
          <Switch
            id="inline-images"
            checked={settings.inlineImages}
            onCheckedChange={checked => onChange({ inlineImages: checked })}
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="preserve-formatting">Preserve Formatting</Label>
          <Switch
            id="preserve-formatting"
            checked={settings.preserveFormatting}
            onCheckedChange={checked =>
              onChange({ preserveFormatting: checked })
            }
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="include-metadata">Include Metadata</Label>
          <Switch
            id="include-metadata"
            checked={settings.includeMetadata}
            onCheckedChange={checked => onChange({ includeMetadata: checked })}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
