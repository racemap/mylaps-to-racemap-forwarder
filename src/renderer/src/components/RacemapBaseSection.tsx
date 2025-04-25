import React from "react";
import { api } from "@renderer/api";
import { Badge, Col, Flex, Input, Row, Select } from "antd";
import type { ServerState } from "src/main/types";
import {
	EyeTwoTone,
	DoubleRightOutlined,
	EyeInvisibleOutlined,
	CheckCircleTwoTone,
	InfoCircleTwoTone,
} from "@ant-design/icons";

const RacemapBaseSection = (): React.ReactNode => {
	const [appState, setAppState] = React.useState<ServerState>({
		apiToken: "",
		apiTokenIsValid: false,
		events: [],
		user: null,
	});

	const onTokenChange = async (newToken: string) => {
		const newAppState = {
			...appState,
			apiToken: newToken,
			apiTokenIsValid: await api.upgradeAPIToken(newToken),
		};
		console.log("newAppState", newAppState);
		setAppState(newAppState);
	};

	const onChange = (value: string) => {
		console.log(`selected ${value}`);
	};

	const onSearch = (value: string) => {
		console.log("search:", value);
	};

	React.useEffect(() => {
		const fetchState = async () => {
			const state = await api.getServerState();
			setAppState(state);
		};
		fetchState();
	}, []);

	return (
		<>
			<Row>
				<Col span={15}>
					<h2>Racemap API Token</h2>
					<Flex gap="middle" align="start">
						<Input.Password
							size="large"
							value={appState?.apiToken ?? ""}
							placeholder="Paste your API Token here."
							prefix={<DoubleRightOutlined />}
							iconRender={(visible) =>
								visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
							}
							onChange={(e) => onTokenChange(e.target.value)}
						/>
						{appState?.apiTokenIsValid ? (
							<CheckCircleTwoTone
								title="Your API Token is valid."
								twoToneColor="#52c41a"
								style={{ fontSize: "30px", marginTop: "4px" }}
							/>
						) : (
							<InfoCircleTwoTone
								title="Your API Token is invalid. Plese check on racemap.com."
								twoToneColor="#eb2f96"
								style={{ fontSize: "30px", marginTop: "4px" }}
							/>
						)}
					</Flex>

					<h2>Select Racemap Event</h2>
					<Flex gap="middle" align="start">
						<Select
							style={{ width: "100%" }}
							size="large"
							showSearch
							placeholder="Select one of your prediction events."
							optionFilterProp="label"
							onChange={onChange}
							onSearch={onSearch}
							options={[
								{
									value: "jack",
									label: "Jack",
								},
								{
									value: "lucy",
									label: "Lucy",
								},
								{
									value: "tom",
									label: "Tom",
								},
							]}
						/>
						{appState?.events?.length > 0 ? (
							<CheckCircleTwoTone
								title="Your API Token is valid."
								twoToneColor="#52c41a"
								style={{ fontSize: "30px", marginTop: "4px" }}
							/>
						) : (
							<InfoCircleTwoTone
								title="Your API Token is invalid. Plese check on racemap.com."
								twoToneColor="#eb2f96"
								style={{ fontSize: "30px", marginTop: "4px" }}
							/>
						)}
					</Flex>
				</Col>
				<Col span={8} offset={1}>
					<h2>State</h2>
				</Col>
			</Row>
		</>
	);
};

export default RacemapBaseSection;
