import { Tabs, type TabsProps } from 'antd';
import styled from 'styled-components';

const App = () => {
  const items: TabsProps['items'] = [
    {
      key: '1',
      label: 'MyLaps',
      children: 'Content of Tab Pane 1',
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
  return (
    <Container>
      <h1>Hello World</h1>
      <Tabs defaultActiveKey="1" items={items} />
    </Container>
  );
};

const Container = styled.div`
  margin: 10px;
`;

export default App;
