import React from 'react';
import styled from 'styled-components';
import RacemapIcon from './RacemapIcon';
import { api } from '@renderer/api';
import { JsonView } from 'react-json-view-lite';
import type { ServerState } from '../../../types';
import { EmptyServerState } from '../../../consts';
import { TimingSystemTabs } from './TimingSystemsTabs';
import { Col, Flex, Input, Row, Select } from 'antd';
import { EyeTwoTone, InfoCircleTwoTone, CheckCircleTwoTone, DoubleRightOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import 'react-json-view-lite/dist/index.css';

const RacemapBaseSection = (): React.ReactNode => {
  const [appState, setAppState] = React.useState<ServerState>(EmptyServerState);
  const [stdout, setStdout] = React.useState<Array<string>>([]);

  const onTokenChange = async (newToken: string) => {
    const newAppState = {
      ...appState,
      apiToken: newToken,
      apiTokenIsValid: await api.upgradeAPIToken(newToken),
    };
    setAppState(newAppState);
  };

  const onChange = (value: string) => {
    console.log(`selected ${value}`);
  };

  const onSearch = (value: string) => {
    console.log('search:', value);
  };

  React.useEffect(() => {
    // Fetch the initial state
    const fetchState = async () => {
      const serverState = await api.getServerState();
      setAppState(serverState);
    };
    fetchState();

    const stateChangeHandler = (serverState: ServerState) => {
      setAppState(serverState);
    };

    const newStdOutLineHandler = (newLine: string) => {
      setStdout((prev) => [newLine, ...prev].slice(0, 500));
    };

    // Listen to server state changes
    window.api.onServerStateChange(stateChangeHandler);
    window.api.onNewStdOutLine(newStdOutLineHandler);

    return () => {
      window.api.removeServerStateChangeListener(stateChangeHandler);
      window.api.removeOnNewStdOutLineListener(newStdOutLineHandler);
    };
  }, []);

  return (
    <>
      <Flex gap={'8px'} justify="start" align="baseline">
        <RacemapIcon style={{ marginRight: '20px' }} />
        <h1>2 RACEMAP Forwarder</h1>
        <span>{appState.version?.gitTag.split('_')[0]}</span>
      </Flex>
      <HorizontalLine />
      <Row>
        <Col span={13}>
          <h2>RACEMAP API Token</h2>
          <Flex gap="middle" align="start">
            <Input.Password
              size="large"
              value={appState?.apiToken ?? ''}
              placeholder="Paste your API Token here."
              prefix={<DoubleRightOutlined />}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              onChange={(e) => onTokenChange(e.target.value)}
            />
            {appState?.apiTokenIsValid ? (
              <CheckCircleTwoTone title="Your API Token is valid." twoToneColor="#52c41a" style={{ fontSize: '30px', marginTop: '4px' }} />
            ) : (
              <InfoCircleTwoTone
                title="Your API Token is invalid. Plese check on racemap.com."
                twoToneColor="#eb2f96"
                style={{ fontSize: '30px', marginTop: '4px' }}
              />
            )}
          </Flex>
          <TinyExplaination>
            The token gives you access to your RACEMAP Account. It's <strong>required</strong>.
          </TinyExplaination>
          <h2>Select RACEMAP Event</h2>
          <Flex gap="middle" align="start">
            <Select
              style={{ width: '100%' }}
              size="large"
              showSearch
              placeholder="Select one of your prediction events."
              optionFilterProp="label"
              onChange={onChange}
              onSearch={onSearch}
              disabled={!appState?.apiTokenIsValid}
              options={appState?.events?.map((event) => ({
                label: event.name,
                value: event.id,
              }))}
            />
            {appState?.selectedEvent !== null ? (
              <CheckCircleTwoTone title="Your API Token is valid." twoToneColor="#52c41a" style={{ fontSize: '30px', marginTop: '4px' }} />
            ) : (
              <InfoCircleTwoTone
                title="Your API Token is invalid. Plese check on racemap.com."
                twoToneColor="#b2b2b2"
                style={{ fontSize: '30px', marginTop: '4px' }}
              />
            )}
          </Flex>
          <TinyExplaination>
            To select an event is <strong>optional</strong>. When using gun-times they will be assigned to the participants listed in the event.
            Otherwise the gun-times will be dropped.
          </TinyExplaination>
        </Col>
        <Col span={10} offset={1}>
          <h2>State</h2>
          <StateDetailsContainer>
            <JsonView data={appState} />
          </StateDetailsContainer>
        </Col>
      </Row>
      <TimingSystemTabs appState={appState} logLines={stdout} />
    </>
  );
};

export default RacemapBaseSection;

const StateDetailsContainer = styled.div`
  height: 210px;
  overflow-y: scroll;
`;

const TinyExplaination = styled.p`
  margin-left: 10px;
  font-size: 12px;
  color: #888;
`;

const HorizontalLine = styled.div`
  width: 100%;
  height: 1px;
  background-color: #ccc;
`;
