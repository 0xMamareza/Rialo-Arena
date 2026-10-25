"use client";

import { useI18n } from "@/app/_components/language-provider";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import {
  buildXAvatarUrl,
  normalizeXUsername,
  RIALO_AVATAR_FALLBACK_PATH,
} from "@/lib/identity/username";

import styles from "./profile-panel.module.css";

type PublicProfile = {
  username: string;
  profileImageUrl: string;
};

type ProfilePanelProps = {
  initialProfile: PublicProfile | null;
  quizEntryRequested?: boolean;
  quizAttemptId?: string | null;
};

type FlowStep = "entry" | "confirm" | "submitting";

type PreviewProfile = PublicProfile;

type DirectAvatarProps = {
  src: string;
  alt: string;
  className: string;
  onLoad?: () => void;
  onError?: () => void;
};

function DirectAvatar({
  src,
  alt,
  className,
  onLoad,
  onError,
}: DirectAvatarProps) {
  return (
    // Browser-direct by design: Next Image would otherwise proxy the Unavatar request.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width="320"
      height="320"
      className={className}
      referrerPolicy="no-referrer"
      onLoad={onLoad}
      onError={onError}
    />
  );
}

function RialoAvatarFallback({ className = "" }: { className?: string }) {
  return (
    <span className={`${styles.avatarFallback} ${className}`} aria-hidden="true">
      {/* First-party fallback is intentionally independent of avatar services. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={RIALO_AVATAR_FALLBACK_PATH}
        alt=""
        width="160"
        height="160"
      />
    </span>
  );
}

function isPublicProfile(value: unknown): value is PublicProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.username === "string" &&
    typeof candidate.profileImageUrl === "string"
  );
}

export function ProfilePanel({
  initialProfile,
  quizEntryRequested = false,
  quizAttemptId = null,
}: ProfilePanelProps) {
  const { t, locale, direction } = useI18n();
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [profileAvatarFailed, setProfileAvatarFailed] = useState(false);
  const [profileAvatarLoaded, setProfileAvatarLoaded] = useState(false);
  const [previewAvatarFailed, setPreviewAvatarFailed] = useState(false);
  const [previewAvatarLoaded, setPreviewAvatarLoaded] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [step, setStep] = useState<FlowStep>("entry");
  const [usernameInput, setUsernameInput] = useState("");
  const [preview, setPreview] = useState<PreviewProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(
    quizEntryRequested && !initialProfile,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();

  useEffect(() => {
    if (dialogOpen && step === "entry") {
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [dialogOpen, step]);

  useEffect(() => {
    if (!quizEntryRequested || profile || dialogRef.current?.open) {
      return;
    }

    dialogRef.current?.showModal();
  }, [profile, quizEntryRequested]);

  useEffect(() => {
    if (!profile || profileAvatarLoaded || profileAvatarFailed) {
      return;
    }

    const timeout = window.setTimeout(() => setProfileAvatarFailed(true), 4_000);
    return () => window.clearTimeout(timeout);
  }, [profile, profileAvatarFailed, profileAvatarLoaded]);

  useEffect(() => {
    if (!preview || previewAvatarLoaded || previewAvatarFailed) {
      return;
    }

    const timeout = window.setTimeout(() => setPreviewAvatarFailed(true), 4_000);
    return () => window.clearTimeout(timeout);
  }, [preview, previewAvatarFailed, previewAvatarLoaded]);

  const resetEntry = (suggestedUsername = "") => {
    setUsernameInput(suggestedUsername);
    setPreview(null);
    setPreviewAvatarFailed(false);
    setPreviewAvatarLoaded(false);
    setErrorMessage(null);
    setStep("entry");
  };

  const openDialog = () => {
    resetEntry(profile?.username ?? "");
    setLogoutError(null);
    setDialogOpen(true);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setErrorMessage(null);
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  };

  const findProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const username = normalizeXUsername(usernameInput);
      setPreview({
        username,
        profileImageUrl: buildXAvatarUrl(username),
      });
      setPreviewAvatarFailed(false);
      setPreviewAvatarLoaded(false);
      setErrorMessage(null);
      setStep("confirm");
    } catch (error) {
      const message =
        error && typeof error === "object" && "issues" in error
          ? ((error as { issues?: Array<{ message?: string }> }).issues?.[0]
              ?.message ?? "Enter a valid X username.")
          : "Enter a valid X username.";
      setErrorMessage(message);
    }
  };

  const confirmAccount = async () => {
    if (!preview || step === "submitting") {
      return;
    }

    setErrorMessage(null);
    setStep("submitting");

    try {
      const response = await fetch("/api/profile/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: preview.username }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        const serverError =
          body && typeof body === "object" && "error" in body
            ? (body as { error?: unknown }).error
            : null;
        throw new Error(
          typeof serverError === "string"
            ? serverError
            : "We couldn't prepare your profile. Try again.",
        );
      }

      if (!isPublicProfile(body)) {
        throw new Error("We couldn't prepare your profile. Try again.");
      }

      setProfile(body);
      setProfileAvatarFailed(false);
      setProfileAvatarLoaded(false);

      if (quizEntryRequested) {
        const quizDestination = quizAttemptId
          ? `/quiz?attempt=${encodeURIComponent(quizAttemptId)}`
          : "/quiz";
        router.push(quizDestination);
      } else {
        closeDialog();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't prepare your profile. Try again.",
      );
      setStep("confirm");
    }
  };

  const logout = async () => {
    if (logoutPending) {
      return;
    }

    setLogoutPending(true);
    setLogoutError(null);

    try {
      const response = await fetch("/api/session/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      setProfile(null);
      setProfileAvatarFailed(false);
      setProfileAvatarLoaded(false);
      resetEntry();
      router.replace("/");
      router.refresh();
    } catch {
      setLogoutError("We couldn't sign you out. Try again.");
    } finally {
      setLogoutPending(false);
    }
  };

  return (
    <div lang={locale} dir={direction} className={styles.identityPanel}>
      {profile ? (
        <div className={styles.readyState}>
          <div className={styles.readyProfile}>
            {profileAvatarFailed ? (
              <RialoAvatarFallback />
            ) : (
              <DirectAvatar
                src={profile.profileImageUrl}
                alt={t("Public X avatar for @{username}", { username: profile.username })}
                className={styles.readyAvatar}
                onLoad={() => setProfileAvatarLoaded(true)}
                onError={() => setProfileAvatarFailed(true)}
              />
            )}
            <div>
              <span className={styles.status}>{t("Profile ready")}</span>
              <strong dir="ltr">@{profile.username}</strong>
            </div>
          </div>
          <div className={styles.profileActions}>
            <button className={styles.changeButton} type="button" onClick={openDialog}>
              {t("Change")}
            </button>
            <button
              className={styles.changeButton}
              type="button"
              disabled={logoutPending}
              onClick={logout}
            >
              {logoutPending ? t("Signing out") : t("Logout")}
            </button>
          </div>
          {logoutError ? (
            <p className={`${styles.error} ${styles.readyError}`} role="alert">
              {t(logoutError)}
            </p>
          ) : null}
          <Link className={styles.startQuizLink} href="/quiz">
            {t("Start quiz")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : (
        <div className={styles.entryCta}>
          <button className={styles.primaryButton} type="button" onClick={openDialog}>
            {t("Enter X username")}
            <span aria-hidden="true">→</span>
          </button>
          <p>
            {t("Choose public profile metadata for your Arena identity. This does not verify X account ownership.")}
          </p>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={handleDialogClose}
        onClick={handleBackdropClick}
      >
        <div className={styles.dialogSurface}>
          <button
            className={styles.closeButton}
            type="button"
            aria-label={t("Close profile setup")}
            onClick={closeDialog}
          >
            ×
          </button>

          {step === "entry" ? (
            <form className={styles.form} onSubmit={findProfile}>
              <span className={styles.stepMarker}>{t("Profile setup / {step}", { step: "01" })}</span>
              <h2 className={styles.headline} id={titleId}>
                <span>{t("Enter your X username")}</span>
              </h2>
              <p id={descriptionId}>
                {t("We'll find your public profile so you can confirm it.")}
              </p>
              <label className={styles.inputLabel} htmlFor="x-username">
                {t("X username")}
              </label>
              <div className={styles.inputShell}>
                <span aria-hidden="true">@</span>
                <input
                  ref={inputRef}
                  id="x-username"
                  dir="ltr"
                  name="username"
                  type="text"
                  value={usernameInput}
                  onChange={(event) => setUsernameInput(event.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={64}
                  aria-invalid={errorMessage ? true : undefined}
                  aria-describedby={errorMessage ? errorId : descriptionId}
                />
              </div>
              {errorMessage ? (
                <p className={styles.error} id={errorId} role="alert">
                  {t(errorMessage)}
                </p>
              ) : null}
              <button className={styles.primaryButton} type="submit">
                {t("Find my profile")}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          ) : (
            <div className={styles.confirmation}>
              <span className={styles.stepMarker}>{t("Profile setup / {step}", { step: "02" })}</span>
              <h2 className={styles.headline} id={titleId}>
                <span>{t("Use this profile?")}</span>
              </h2>
              <p id={descriptionId}>
                {t("Confirm the public metadata you want to display. This does not verify ownership.")}
              </p>

              {preview ? (
                <div className={styles.avatarFrame} aria-live="polite">
                  {previewAvatarFailed ? (
                    <RialoAvatarFallback className={styles.previewAvatar} />
                  ) : (
                    <DirectAvatar
                      src={preview.profileImageUrl}
                      alt={t("Public X avatar for @{username}", { username: preview.username })}
                      className={styles.previewAvatar}
                      onLoad={() => setPreviewAvatarLoaded(true)}
                      onError={() => setPreviewAvatarFailed(true)}
                    />
                  )}
                </div>
              ) : null}

              {preview ? <strong className={styles.previewUsername} dir="ltr">@{preview.username}</strong> : null}

              {errorMessage ? (
                <p className={styles.error} id={errorId} role="alert">
                  {t(errorMessage)}
                </p>
              ) : null}

              <div className={styles.confirmActions}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  disabled={step === "submitting"}
                  onClick={confirmAccount}
                >
                  {step === "submitting" ? t("Preparing profile…") : t("Yes, continue")}
                  <span aria-hidden="true">→</span>
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={step === "submitting"}
                  onClick={() => resetEntry(preview?.username ?? "")}
                >
                  {t("No, try again")}
                </button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
