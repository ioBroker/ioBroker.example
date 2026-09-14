import React from "react";
import { CssBaseline, StyledEngineProvider, ThemeProvider } from "@mui/material";
import {
	GenericApp,
	Loader,
	ScrollbarStyles,
	type GenericAppProps,
	type GenericAppSettings,
} from "@iobroker/gui-components";
import Settings from "./components/Settings";
import en from "./i18n/en.json";
import de from "./i18n/de.json";
import ru from "./i18n/ru.json";
import pt from "./i18n/pt.json";
import nl from "./i18n/nl.json";
import fr from "./i18n/fr.json";
import it from "./i18n/it.json";
import es from "./i18n/es.json";
import pl from "./i18n/pl.json";
import uk from "./i18n/uk.json";
import zhCn from "./i18n/zh-cn.json";

class App extends GenericApp {
	constructor(props: GenericAppProps) {
		const extendedProps: GenericAppSettings = {
			...props,
			encryptedFields: [],
			translations: {
				en,
				de,
				ru,
				pt,
				nl,
				fr,
				it,
				es,
				pl,
				uk,
				"zh-cn": zhCn,
			},
		};
		// the Vite dev server runs on port 3000, but the socket must connect to ioBroker admin
		if (window.location.port === "3000") {
			extendedProps.socket = { port: 8081 };
		}
		super(props, extendedProps);
	}

	onConnectionReady(): void {
		// executed when connection is ready
	}

	render(): React.JSX.Element {
		if (!this.state.loaded) {
			return (
				<StyledEngineProvider injectFirst>
					<ThemeProvider theme={this.state.theme}>
						<Loader themeType={this.state.themeType} />
					</ThemeProvider>
				</StyledEngineProvider>
			);
		}

		return (
			<StyledEngineProvider injectFirst>
				<ThemeProvider theme={this.state.theme}>
					<ScrollbarStyles theme={this.state.theme} />
					<CssBaseline />
					<div className="App">
						<Settings
							native={this.state.native}
							onChange={(attr, value) => this.updateNativeValue(attr, value)}
						/>
						{this.renderHelperDialogs()}
					</div>
				</ThemeProvider>
			</StyledEngineProvider>
		);
	}
}

export default App;
