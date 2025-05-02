import { Tabs, type TabsProps } from 'antd';
import type { ServerState } from 'src/main/types';
import { MyLapsForwarderDetails } from './MyLapsForwarderDetails';

type TimingSystemTabsProps = {
  appState: ServerState;
};

export const TimingSystemTabs = ({ appState }: TimingSystemTabsProps) => {
  const items: TabsProps['items'] = [
    {
      key: '1',
      label: 'MyLaps',
      children: <MyLapsForwarderDetails forwarderState={appState.myLapsForwarder} />,
    },
    {
      key: '2',
      label: 'ChronoTrack',
      children: 'Content of Tab Pane 2',
    },
    {
      key: '3',
      label: 'RaceTec',
      children: 'Content of Tab Pane 3',
    },
  ];

  return <Tabs defaultActiveKey="1" items={items} />;
};
