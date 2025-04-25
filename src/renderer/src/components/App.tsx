import { Tabs, type TabsProps } from "antd";
import styled from "styled-components";
import RacemapBaseSection from "./RacemapBaseSection";

const App = () => {
	const items: TabsProps["items"] = [
		{
			key: "1",
			label: "MyLaps",
			children: "Content of Tab Pane 1",
		},
		{
			key: "2",
			label: "ChronoTrack",
			children: "Content of Tab Pane 2",
		},
		{
			key: "3",
			label: "RaceTec",
			children: "Content of Tab Pane 3",
		},
	];
	return (
		<Container>
			<h1>2 Racemap Forwarder</h1>
			<RacemapBaseSection />
			<Tabs defaultActiveKey="1" items={items} />
		</Container>
	);
};

const Container = styled.div`
  margin: 20px;
`;

export default App;
