import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ExcelUpload from './components/ExcelUpload';
import Navigation from './components/Navigation';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <main className="main-content">
          <Switch>
            <Route path="/" exact component={ExcelUpload} />
            <Route path="/dashboard" component={Dashboard} />
          </Switch>
        </main>
      </div>
    </Router>
  );
};

export default App;