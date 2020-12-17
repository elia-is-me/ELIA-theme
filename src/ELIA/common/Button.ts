import { scale, StringFormat, TextRenderingHint, MeasureString, CursorName, setAlpha, SmoothingMode } from "./common";
import { Component } from "./BasePart";
import { ui } from "./UserInterface";
import { MaterialFont } from "./Icon";

const textRenderingHint = ui.textRender;

export const enum ButtonStates {
	Normal = 0,
	Hover = 1,
	Down = 2,
	Disable = 3,
};

export class Clickable extends Component {
	state: ButtonStates = ButtonStates.Normal;

	/**
	 * changeState(state) will not change a disabled button's state;
	 */
	changeState(state: number) {
		// it's weid here
		if (this.state === ButtonStates.Disable || state === ButtonStates.Disable) {
			return;
		}
		if (this.state !== state) {
			this.state = state;
			this.repaint();
		}
	}

	disable() {
		this.state = ButtonStates.Disable;
	}

	enable() {
		this.state = ButtonStates.Normal;
	}

	on_init() {
		this.changeState(ButtonStates.Normal);
	}

	on_mouse_move(x: number, y: number) {
		if (this.state === ButtonStates.Normal) {
			this.changeState(ButtonStates.Hover);
		}
		if (this.trace(x, y)) {
			window.SetCursor(CursorName.IDC_HAND);
		} else {
			window.SetCursor(CursorName.IDC_ARROW);
		}
	}

	on_mouse_lbtn_down() {
		this.changeState(ButtonStates.Down);
	}

	on_mouse_lbtn_up(x: number, y: number) {
		if (this.state === ButtonStates.Down) {
			if (this.trace(x, y)) {
				this.on_click && this.on_click(x, y);
			}
		}
		this.changeState(ButtonStates.Hover);
	}

	on_mouse_leave() {
		this.changeState(ButtonStates.Normal);
		window.SetCursor(CursorName.IDC_ARROW);
	}
}

/**
 * For buttons only contains an icon, currently there is no click animations or
 * background color effects.
 */
export class IconButton extends Clickable {
	icon: string;
	fontName: string = MaterialFont;
	fontSize: number;
	fontStyle: number = 0;
	foreColors: number[] = [];
	backgroundColors: number[];
	private _iconFont: IGdiFont;

	constructor(options: {
		icon: string;
		fontName?: string;
		fontSize: number;
		colors: number[];
	}) {
		super(options);
		this.setIcon(options.icon, options.fontSize && this.fontSize);
		this.setColors.apply(this, options.colors);
	}

	setIcon(code: string, fontSize?: number) {
		this.icon = code;
		if (fontSize) {
			this.fontSize = fontSize;
			this._iconFont = gdi.Font(this.fontName, this.fontSize, this.fontStyle);
		}
	}

	/**
	 * By default,
	 */
	setColors(foreColor: number, backgroundColor?: number) {
		this.foreColors = [foreColor, setAlpha(foreColor, 200), setAlpha(foreColor, 127), setAlpha(foreColor, 127)];

		// TODO;
		if (backgroundColor) {
			this.backgroundColors = [];
		}
	}

	on_paint(gr: IGdiGraphics) {
		let { icon, _iconFont, foreColors, state } = this;
		gr.DrawString(icon, _iconFont, foreColors[state], this.x, this.y, this.width, this.height, StringFormat.Center);
	}
}

export const enum ButtonStyles {
	Contained = "contained",
	Outlined = "outlined",
	Text = "text"
}

const buttonTextFont = gdi.Font("segoe ui semibold", scale(14));
const buttonIconFont = gdi.Font(MaterialFont, scale(22));

export interface IButtonOptions {
	style: string;
	text: string;
	icon?: string;
	foreColor: number;
	backgroundColor?: number;
}

export class Button extends Clickable {
	style: string;
	text: string;
	icon?: string;

	private _textFont: IGdiFont = buttonTextFont;
	private _iconFont: IGdiFont = buttonIconFont;
	private _foreColors: number[] = [];
	private _backgroundColors: number[] = [];
	private _iconX: number;
	private _textX: number;
	private _textWidth: number;
	private _iconWidth: number;
	private _buttonWidth: number;
	private _buttonHeight: number;
	private _minWidth = scale(70);
	private _padLR: number;
	private _gap: number;

	constructor(opts: IButtonOptions) {
		super({})
		this.style = opts.style;
		this.text = opts.text;
		this.icon = opts.icon;
		this.setColors(opts.foreColor, opts.backgroundColor);
		this._setButtonSize();
	}

	setColors(foreColor: number, backgroundColor: number) {
		switch (this.style) {
			case ButtonStyles.Contained:
				this._foreColors = [
					foreColor, foreColor, foreColor, foreColor
				];
				this._backgroundColors = [
					backgroundColor,
					setAlpha(backgroundColor, 220),
					setAlpha(backgroundColor, 180),
					setAlpha(backgroundColor, 127)
				];
				break;
			case ButtonStyles.Outlined:
			case ButtonStyles.Text:
				this._foreColors = [
					foreColor,
					setAlpha(foreColor, 200),
					setAlpha(foreColor, 127),
					setAlpha(foreColor, 127)
				];
				this._backgroundColors = [];
				break;
		}
	}

	private _setButtonSize() {
		let textWidth = MeasureString(this.text, this._textFont).Width;
		let iconWidth = scale(18);
		let gap = scale(8);
		let padLR: number;
		if (this.style === ButtonStyles.Text) {
			padLR = scale(8);
		} else {
			padLR = scale(16);
		}
		let buttonWidth = 2 * padLR + textWidth + (this.icon ? iconWidth + gap : 0);
		if (buttonWidth < this._minWidth) {
			padLR = (this._minWidth - textWidth - (this.icon ? iconWidth + gap : 0)) / 2;
			buttonWidth = this._minWidth;
		}

		this._iconWidth = iconWidth;
		this._textWidth = textWidth;
		this._buttonWidth = buttonWidth;
		this._buttonHeight = scale(36);
		this._padLR = padLR;
		this._gap = gap;
		//
		this.setSize(this._buttonWidth, this._buttonHeight);
	}

	on_size() {
		this._iconX = this.x + this._padLR;
		this._textX = this.x + this._padLR + (this.icon ? this._iconWidth + this._gap : 0)
	}

	on_paint(gr: IGdiGraphics) {
		let { x, y, width, height } = this;
		let foreColor = this._foreColors[this.state];
		let backgroundColor = this._backgroundColors[this.state];
		let radius = scale(2);
		let borderWidth = scale(1);

		// Button's background & border;
		gr.SetSmoothingMode(SmoothingMode.AntiAlias);
		if (this.style === "contained") {
			gr.FillRoundRect(x, y, width, height, radius, radius, backgroundColor);
		} else if (this.style === "outlined") {
			gr.DrawRoundRect(x, y, width - 1, height - 1, radius, radius, borderWidth, foreColor);
		}
		gr.SetSmoothingMode(SmoothingMode.Default);

		// draw button's icon & text;

		this._iconX = this.x + this._padLR;
		this._textX = this.x + this._padLR + (this.icon ? this._iconWidth + this._gap : 0)
		let { _iconX, _iconWidth, _textX, _textWidth } = this;
		let { text, icon, _textFont, _iconFont } = this;
		if (icon) {
			gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
			// gr.FillSolidRect(_iconX, y, _iconWidth, height, 0xf0aabbcc);
			gr.DrawString(icon, _iconFont, foreColor, _iconX, y, _iconWidth, height, StringFormat.Center);
			gr.SetTextRenderingHint(textRenderingHint);
		}
		if (text) {
			gr.DrawString(text, _textFont, foreColor, _textX, y, _textWidth, height, StringFormat.LeftCenter);
		}
	}

}