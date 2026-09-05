import { TextField } from '@mui/material';
import { validateCondition, validateTransform } from '../../../lib/safeExpressions';

export function scriptError(value: string, condition = false): string {
    try { (condition ? validateCondition : validateTransform)(value); return ''; }
    catch (error) { return error instanceof Error ? error.message : String(error); }
}
export default function ScriptField({ value, onChange, condition = false, label = 'Transformation' }: {
    value: string; onChange: (value: string) => void; condition?: boolean; label?: string;
}) {
    const error = scriptError(value, condition);
    return <TextField fullWidth multiline minRows={condition ? 2 : 4} size="small" label={label}
        value={value} onChange={e => onChange(e.target.value)} error={!!error}
        helperText={error || (condition ? 'Compare payload fields, for example payload.amount > 100.' : 'Assign payload fields and optionally return payload. Function calls and browser globals are unavailable.')}
        placeholder={condition ? 'payload.amount > 100' : 'payload.status = "processed";\nreturn payload;'}
        slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 12 } } }} />;
}
