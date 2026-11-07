import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';

const DEVICE_FINGERPRINT_KEY = 'unichat-device-fingerprint';

function getDeviceFingerprint() {
    let fingerprint = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    if (!fingerprint) {
        fingerprint = typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
    }
    return fingerprint;
}

export default function LoginPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);

    const countries = [
        { code: '+7', ru: 'Россия', en: 'Russia' },
        { code: '+1', ru: 'США', en: 'United States' },
        { code: '+44', ru: 'Великобритания', en: 'United Kingdom' },
        { code: '+49', ru: 'Германия', en: 'Germany' },
        { code: '+91', ru: 'Индия', en: 'India' },
    ];
    const [step, setStep] = useState<'phone' | 'code' | 'cloud-password'>('phone');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+7');
    const [code, setCode] = useState('');
    const [cloudPassword, setCloudPassword] = useState('');
    const [cloudPasswordChallenge, setCloudPasswordChallenge] = useState('');
    const [devCode, setDevCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [isLightTheme, setIsLightTheme] = useState(document.documentElement.dataset.theme === 'light');

    const switchLang = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('locale', lng);
    };

    const toggleTheme = () => {
        const nextTheme = isLightTheme ? 'dark' : 'light';
        document.documentElement.dataset.theme = nextTheme;
        localStorage.setItem('unichat-theme', nextTheme);
        setIsLightTheme(nextTheme === 'light');
    };

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setNotice('');
        setLoading(true);
        const trimmedPhone = phone.trim();
        const phoneDigits = trimmedPhone.replace(/\D/g, '');
        const dialDigits = countryCode.slice(1);
        const includesCountryCode = phoneDigits.startsWith(dialDigits) && phoneDigits.length > 10;
        const nationalNumber = countryCode === '+7' && phoneDigits.startsWith('8')
            ? phoneDigits.slice(1)
            : phoneDigits.replace(/^0+/, '');
        const submittedPhone = trimmedPhone.startsWith('+')
            ? trimmedPhone
            : `+${includesCountryCode ? phoneDigits : `${dialDigits}${nationalNumber}`}`;
        try {
            const result = await api.sendCode(submittedPhone);
            if (result.error) {
                setError(result.retryAfterSeconds > 0 ? t('auth.tooManyAttempts') : result.error);
            } else {
                setPhone(submittedPhone);
                setStep('code');
                if (result.code) setDevCode(result.code);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = () => switchLang(i18n.language === 'en' ? 'ru' : 'en');

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const fingerprint = getDeviceFingerprint();
            const result = await api.verifyCode(phone, code, fingerprint);
            if (result.error) {
                setError(result.error);
            } else if (result.requiresCloudPassword && result.challengeToken) {
                setCloudPasswordChallenge(result.challengeToken);
                setStep('cloud-password');
            } else {
                setAuth(result);
                navigate(result.isNewUser ? '/profile-setup' : '/chat');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCloudPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await api.verifyCloudPassword(cloudPasswordChallenge, cloudPassword);
            if (result.error) {
                setError(result.error);
            } else {
                setAuth(result);
                navigate(result.isNewUser ? '/profile-setup' : '/chat');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <button
                    className="login-theme-toggle"
                    type="button"
                    onClick={toggleTheme}
                    aria-label={isLightTheme ? t('auth.switchToDarkTheme') : t('auth.switchToLightTheme')}
                    title={isLightTheme ? t('auth.switchToDarkTheme') : t('auth.switchToLightTheme')}
                >
                    {isLightTheme ? '☾' : '☀'}
                </button>

                <div className="login-logo">
                    <div className="login-logo-icon" aria-hidden="true">
                        <svg viewBox="0 0 48 48" focusable="false">
                            <path d="M10 12.5A7.5 7.5 0 0 1 17.5 5h19A7.5 7.5 0 0 1 44 12.5v15a7.5 7.5 0 0 1-7.5 7.5H22l-11 8v-8.3a7.5 7.5 0 0 1-1-3.7z" />
                            <circle cx="20" cy="20" r="2" />
                            <circle cx="27" cy="20" r="2" />
                            <circle cx="34" cy="20" r="2" />
                        </svg>
                    </div>
                    <h1>UniChat</h1>
                    <p>{t('auth.loginDescription')}</p>
                </div>

                {step === 'phone' ? (
                    <form className="login-form" onSubmit={handleSendCode}>
                        <div className="input-group">
                            <label className="sr-only" htmlFor="login-country">{t('auth.country')}</label>
                            <div className="login-country-field">
                                <select
                                    id="login-country"
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    aria-label={t('auth.country')}
                                >
                                    {countries.map((country) => (
                                        <option key={country.code} value={country.code}>
                                            {i18n.language === 'ru' ? country.ru : country.en}
                                        </option>
                                    ))}
                                </select>
                                <span className="login-country-code">{countryCode}</span>
                                <span className="login-country-chevron" aria-hidden="true" />
                            </div>
                            <input
                                id="login-phone"
                                className="input"
                                type="tel"
                                placeholder={t('auth.phonePlaceholder')}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                autoFocus
                                aria-label={t('auth.phone')}
                            />
                        </div>

                        {error && <div className={`login-error ${error === 'Ваш аккаунт заблокирован!' ? 'blocked-account' : ''}`}>{error}</div>}

                        <button className="login-next-button" type="submit" disabled={loading || !phone}>
                            {loading ? t('auth.sending') : t('auth.next')}
                        </button>
                    </form>
                ) : step === 'code' ? (
                    <form className="login-form" onSubmit={handleVerifyCode}>
                        <div className="login-code-sent">
                            {t('auth.codeSent')}
                            <br />
                            <strong>{phone}</strong>
                        </div>

                        {devCode && (
                            <div className="dev-code">
                                <div className="dev-code-label">🔧 {t('auth.devCode')}</div>
                                <div className="dev-code-value">{devCode}</div>
                            </div>
                        )}

                        <div className="input-group">
                            <label className="sr-only" htmlFor="login-code">{t('auth.code')}</label>
                            <input
                                id="login-code"
                                className="input"
                                type="text"
                                placeholder="• • • • • •"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength={6}
                                required
                                autoFocus
                                aria-label={t('auth.code')}
                            />
                        </div>

                        {error && <div className={`login-error ${error === 'Ваш аккаунт заблокирован!' ? 'blocked-account' : ''}`}>{error}</div>}

                        <button className="login-next-button" type="submit" disabled={loading || code.length !== 6}>
                            {loading ? t('auth.verifying') : t('auth.verify')}
                        </button>

                        <button
                            type="button"
                            className="login-back-button"
                            onClick={() => { setStep('phone'); setCode(''); setDevCode(''); setError(''); }}
                        >
                            {t('auth.phone')}
                        </button>
                    </form>
                ) : (
                    <form className="login-form" onSubmit={handleVerifyCloudPassword}>
                        <div className="login-code-sent">
                            {t('auth.cloudPasswordVerified')}
                            <br />
                            {t('auth.cloudPasswordPrompt')}
                        </div>
                        <div className="input-group">
                            <label className="sr-only" htmlFor="login-cloud-password">{t('auth.cloudPassword')}</label>
                            <input
                                id="login-cloud-password"
                                className="input"
                                type="password"
                                value={cloudPassword}
                                onChange={(event) => setCloudPassword(event.target.value)}
                                autoComplete="current-password"
                                required
                                autoFocus
                                aria-label={t('auth.cloudPassword')}
                            />
                        </div>
                        {error && <div className="login-error" role="alert">{error}</div>}
                        <button className="login-next-button" type="submit" disabled={loading || !cloudPassword}>
                            {loading ? t('auth.cloudPasswordLoading') : t('auth.cloudPasswordSignIn')}
                        </button>
                        <p className="login-recovery-note">{t('auth.cloudPasswordRecovery')}</p>
                        <button
                            type="button"
                            className="login-back-button"
                            onClick={() => { setStep('phone'); setCode(''); setCloudPassword(''); setCloudPasswordChallenge(''); setDevCode(''); setError(''); }}
                        >
                            {t('auth.requestNewCode')}
                        </button>
                    </form>
                )}
                <div className="login-footer">
                    <button className="login-footer-link" type="button" onClick={toggleLanguage}>
                        {t('auth.switchLanguage')}
                    </button>
                    {step === 'phone' && (
                        <button
                            className="login-footer-link login-qr-link"
                            type="button"
                            onClick={() => setNotice(t('auth.qrUnavailable'))}
                        >
                            {t('auth.loginByQr')} <span aria-hidden="true">›</span>
                        </button>
                    )}
                    {notice && <div className="login-notice" role="status">{notice}</div>}
                </div>
            </div>
        </div>
    );
}
