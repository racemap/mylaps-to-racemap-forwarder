import React from 'react';
import { api } from '@renderer/api';
import { Col, Flex, Input, Row, Select } from 'antd';
import type { ServerState } from '../../../types';
import { EmptyServerState } from '../../../consts';
import { EyeTwoTone, DoubleRightOutlined, EyeInvisibleOutlined, CheckCircleTwoTone, InfoCircleTwoTone } from '@ant-design/icons';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { TimingSystemTabs } from './TimingSystemsTabs';
import styled from 'styled-components';

const RacemapBaseSection = (): React.ReactNode => {
  const [appState, setAppState] = React.useState<ServerState>(EmptyServerState);
  const [stdout, setStdout] = React.useState<Array<string>>([]);

  const onTokenChange = async (newToken: string) => {
    const newAppState = {
      ...appState,
      apiToken: newToken,
      apiTokenIsValid: await api.upgradeAPIToken(newToken),
    };
    console.log('newAppState', newAppState);
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
        <h1>2 Racemap Forwarder</h1>
        <span>{appState.version?.gitTag.split('_')[0]}</span>
      </Flex>
      <Row>
        <Col span={13}>
          <h2>Racemap API Token</h2>
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
            The token gives you access to your Racemap Account. It's <strong>required</strong>.
          </TinyExplaination>
          <h2>Select Racemap Event</h2>
          <Flex gap="middle" align="start">
            <Select
              style={{ width: '100%' }}
              size="large"
              showSearch
              placeholder="Select one of your prediction events."
              optionFilterProp="label"
              onChange={onChange}
              onSearch={onSearch}
              options={[
                {
                  value: 'jack',
                  label: 'Jack',
                },
                {
                  value: 'lucy',
                  label: 'Lucy',
                },
                {
                  value: 'tom',
                  label: 'Tom',
                },
              ]}
            />
            {appState?.events?.length > 0 ? (
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
