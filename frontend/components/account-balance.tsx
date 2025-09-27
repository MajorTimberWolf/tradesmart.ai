"use client"

export function AccountBalance() {
  return (
    <div className="bg-card">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm mb-3">Account Section</h3>
        <div className="text-center text-muted-foreground text-sm py-4">Customize as per needed</div>
      </div>

      <div className="p-4 space-y-4">
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} className="p-3 bg-muted/20 rounded text-xs text-muted-foreground">
            Account item {i + 1} - customize as needed
          </div>
        ))}
      </div>
    </div>
  )
}
