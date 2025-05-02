import { Tabs, type TabsProps } from 'antd';
import styled from 'styled-components';
import RacemapBaseSection from './RacemapBaseSection';
import type { API } from 'src/preload';

// define api for window object
declare global {
  interface Window {
    api: API;
  }
}

const App = () => {
  return (
    <Container>
      <h1>2 Racemap Forwarder</h1>
      <RacemapBaseSection />
    </Container>
  );
};

const Container = styled.div`
  margin: 20px;
`;

export default App;
