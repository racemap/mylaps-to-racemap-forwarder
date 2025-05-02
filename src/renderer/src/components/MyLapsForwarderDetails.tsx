import type { ForwarderState } from 'src/main/types';

type MyLapsForwarderDetailsProps = {
  forwarderState: ForwarderState;
};

export const MyLapsForwarderDetails = ({ forwarderState }: MyLapsForwarderDetailsProps) => {
  return (
    <div>
      <h2>MyLaps Forwarder</h2>
      <p>Version: {forwarderState.version?.gitTag}</p>
      <p>Connections:</p>
      <ul>
        {forwarderState.connections.map((connection, index) => (
          <li key={connection.id}>
            {index} {connection.sourceIP}:{connection.sourcePort}{' '}
          </li>
        ))}
      </ul>
    </div>
  );
};
