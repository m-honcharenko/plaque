import {
	registerDecorator,
	type ValidationArguments,
	type ValidationOptions
} from "class-validator"

import { isIconPath } from "../../core/icons/custom-icon.js"

// A custom icon must be plain path data and cannot come with a named icon.
export function IsIconPath(options?: ValidationOptions): PropertyDecorator {
	return (target, propertyName) => {
		registerDecorator({
			name: "isIconPath",
			target: target.constructor,
			propertyName: propertyName as string,
			options: {
				message:
					"icon-path must be path data (M L H V C S Q T A Z and numbers) and cannot be combined with icon",
				...options
			},
			validator: {
				validate(value: unknown, args: ValidationArguments): boolean {
					if (typeof value !== "string") return false
					const { icon } = args.object as { icon?: string }
					return icon === undefined && isIconPath(value)
				}
			}
		})
	}
}
