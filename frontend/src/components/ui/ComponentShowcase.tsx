/**
 * ComponentShowcase — Validación visual de componentes UI
 * Usado solo para testing/desarrollo — no incluir en build
 */

import { Button, Card, Badge } from '@/components/ui'

export function ComponentShowcase() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8 bg-app-bg min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-ink-1 mb-6">Component Showcase</h1>
      </div>

      {/* Button Showcase */}
      <section>
        <h2 className="text-2xl font-semibold text-ink-1 mb-4">Buttons</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-ink-3 mb-2">Variants</p>
            <div className="flex gap-3 flex-wrap">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </div>

          <div>
            <p className="text-sm text-ink-3 mb-2">Sizes</p>
            <div className="flex gap-3 flex-wrap items-center">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>

          <div>
            <p className="text-sm text-ink-3 mb-2">States</p>
            <div className="flex gap-3 flex-wrap">
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <Button variant="primary" isLoading>
                Loading
              </Button>
              <Button variant="primary" icon={<span>→</span>}>
                With Icon
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Card Showcase */}
      <section>
        <h2 className="text-2xl font-semibold text-ink-1 mb-4">Cards</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-ink-3 mb-2">Variants</p>
            <div className="space-y-3">
              <Card variant="default" padding="md">
                <p className="text-sm">Default card with default padding</p>
              </Card>
              <Card variant="elevated" padding="md">
                <p className="text-sm">Elevated card</p>
              </Card>
              <Card variant="outlined" padding="md">
                <p className="text-sm">Outlined card</p>
              </Card>
            </div>
          </div>

          <div>
            <p className="text-sm text-ink-3 mb-2">Highlights</p>
            <div className="space-y-3">
              <Card highlight="success" padding="md">
                <p className="text-sm font-semibold text-green-700">Success — Task completed</p>
              </Card>
              <Card highlight="warning" padding="md">
                <p className="text-sm font-semibold text-amber-700">Warning — Action needed</p>
              </Card>
              <Card highlight="danger" padding="md">
                <p className="text-sm font-semibold text-red-700">Danger — Error occurred</p>
              </Card>
            </div>
          </div>

          <div>
            <p className="text-sm text-ink-3 mb-2">Padding Sizes</p>
            <div className="space-y-3">
              <Card padding="sm">
                <p className="text-sm">Small padding</p>
              </Card>
              <Card padding="md">
                <p className="text-sm">Medium padding</p>
              </Card>
              <Card padding="lg">
                <p className="text-sm">Large padding</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Badge Showcase */}
      <section>
        <h2 className="text-2xl font-semibold text-ink-1 mb-4">Badges</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-ink-3 mb-2">Variants</p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-ink-3 mb-2">Sizes</p>
            <div className="flex gap-2 flex-wrap items-center">
              <Badge size="sm">Small</Badge>
              <Badge size="md">Medium</Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-ink-3 mb-2">With Icons</p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="success" icon="✓">
                Complete
              </Badge>
              <Badge variant="warning" icon="⚠">
                Pending
              </Badge>
              <Badge variant="danger" icon="✕">
                Failed
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-ink-3 mb-2">Real Use Cases</p>
            <div className="space-y-3">
              <Card padding="md">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Plant Stage</span>
                  <Badge variant="info">V3</Badge>
                </div>
              </Card>
              <Card padding="md">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Flowering Stage</span>
                  <Badge variant="warning">F4</Badge>
                </div>
              </Card>
              <Card padding="md">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Level</span>
                  <Badge variant="success">Level 5</Badge>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Responsive Test */}
      <section>
        <h2 className="text-2xl font-semibold text-ink-1 mb-4">Responsive Design</h2>
        <Card padding="lg" className="space-y-4">
          <p className="text-sm text-ink-3">
            Resize your browser to test responsive behavior. Components adapt to mobile/tablet/desktop.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card
                key={i}
                padding="md"
                highlight={i % 3 === 0 ? 'success' : i % 3 === 1 ? 'warning' : 'danger'}
              >
                <div className="text-center">
                  <Badge variant="info" size="sm">
                    Item {i + 1}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
