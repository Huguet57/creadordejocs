import { Upload } from "lucide-react"
import { useRef, type ChangeEvent } from "react"
import { Button } from "../../../components/ui/button.js"

type SpriteImportButtonProps = {
  isImporting: boolean
  onImportFile: (file: File) => void
}

export function SpriteImportButton({ isImporting, onImportFile }: SpriteImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        disabled={isImporting}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mr-1.5 h-3.5 w-3.5" />
        {isImporting ? "Importing..." : "Import"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.webp"
        className="hidden"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const selectedFile = event.currentTarget.files?.[0]
          if (!selectedFile) return
          onImportFile(selectedFile)
          event.currentTarget.value = ""
        }}
      />
    </>
  )
}
