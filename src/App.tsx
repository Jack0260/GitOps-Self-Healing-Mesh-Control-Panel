import { SimProvider, useSim } from '@/context/SimContext';
import { Layout } from '@/components/Layout';
import { OverviewView } from '@/components/views/OverviewView';
import { TopologyView } from '@/components/views/TopologyView';
import { TelemetryView } from '@/components/views/TelemetryView';
import { RollbackView } from '@/components/views/RollbackView';
import { LogsView } from '@/components/views/LogsView';
import { SettingsView } from '@/components/views/SettingsView';

function PageRouter() {
  const { activePage } = useSim();

  switch (activePage) {
    case 'overview': return <OverviewView />;
    case 'topology': return <TopologyView />;
    case 'telemetry': return <TelemetryView />;
    case 'rollback': return <RollbackView />;
    case 'logs': return <LogsView />;
    case 'settings': return <SettingsView />;
    default: return <OverviewView />;
  }
}

function App() {
  return (
    <SimProvider>
      <Layout>
        <PageRouter />
      </Layout>
    </SimProvider>
  );
}

export default App;
