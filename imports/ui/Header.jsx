import MeteorLogo from "./meteor-logo.svg";

export const Header = () => {
  return (
    <div className="header">
      <nav className="nav container">
        <div className="logo-container">
          <MeteorLogo className="logo" />
        </div>
        <h1 className="page-title">Steam Me !</h1>
      </nav>
    </div>
  );
};
