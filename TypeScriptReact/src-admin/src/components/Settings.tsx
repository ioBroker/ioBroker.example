import React from "react";
import {
	Checkbox,
	FormControl,
	FormControlLabel,
	FormHelperText,
	Input,
	MenuItem,
	Select,
	TextField,
} from "@mui/material";
import { I18n } from "@iobroker/gui-components";

const styles = {
	input: {
		marginTop: 0,
		minWidth: 400,
	},
	button: {
		marginRight: 20,
	},
	card: {
		maxWidth: 345,
		textAlign: "center",
	},
	media: {
		height: 180,
	},
	column: {
		display: "inline-block",
		verticalAlign: "top",
		marginRight: 20,
	},
	columnLogo: {
		width: 350,
		marginRight: 0,
	},
	columnSettings: {
		width: "calc(100% - 370px)",
	},
	controlElement: {
		//background: "#d2d2d2",
		marginBottom: 5,
	},
} satisfies Record<string, React.CSSProperties>;

interface SettingsProps {
	native: Record<string, any>;

	onChange: (attr: string, value: any) => void;
}

interface SettingsState {
	// add your state properties here
	dummy?: undefined;
}

class Settings extends React.Component<SettingsProps, SettingsState> {
	constructor(props: SettingsProps) {
		super(props);
		this.state = {};
	}

	renderInput(title: AdminWord, attr: string, type: string): React.JSX.Element {
		return (
			<TextField
				label={I18n.t(title)}
				style={{ ...styles.input, ...styles.controlElement }}
				value={this.props.native[attr]}
				type={type || "text"}
				onChange={e => this.props.onChange(attr, e.target.value)}
				margin="normal"
			/>
		);
	}

	renderSelect(
		title: AdminWord,
		attr: string,
		options: { value: string; title: AdminWord }[],
		style?: React.CSSProperties,
	): React.JSX.Element {
		return (
			<FormControl
				style={{
					paddingTop: 5,
					...styles.input,
					...styles.controlElement,
					...style,
				}}
			>
				<Select
					value={this.props.native[attr] || "_"}
					onChange={e => this.props.onChange(attr, e.target.value === "_" ? "" : e.target.value)}
					input={
						<Input
							name={attr}
							id={`${attr}-helper`}
						/>
					}
				>
					{options.map(item => (
						<MenuItem
							key={`key-${item.value}`}
							value={item.value || "_"}
						>
							{I18n.t(item.title)}
						</MenuItem>
					))}
				</Select>
				<FormHelperText>{I18n.t(title)}</FormHelperText>
			</FormControl>
		);
	}

	renderCheckbox(title: AdminWord, attr: string, style?: React.CSSProperties): React.JSX.Element {
		return (
			<FormControlLabel
				key={attr}
				style={{
					paddingTop: 5,
					...styles.controlElement,
					...style,
				}}
				control={
					<Checkbox
						checked={this.props.native[attr]}
						onChange={() => this.props.onChange(attr, !this.props.native[attr])}
						color="primary"
					/>
				}
				label={I18n.t(title)}
			/>
		);
	}

	render(): React.JSX.Element {
		return (
			<form>
				{this.renderCheckbox("option1", "option1")}
				<br />
				{this.renderInput("option2", "option2", "text")}
			</form>
		);
	}
}

export default Settings;
